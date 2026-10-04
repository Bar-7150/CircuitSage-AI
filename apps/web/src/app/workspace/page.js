/**
 * CircuitSage AI — Unified Desktop Workspace Page (/workspace)
 *
 * Implements the professional Arduino IDE-like workspace:
 * - Top Bar: Branding, project title, board/port selection, Build (Verify), Upload, AI status
 * - Left Sidebar: Project explorer, search, board hardware configuration, project actions
 * - Center Workspace: Monaco Editor with tab strip, keyboard shortcuts, compiler diagnostics
 * - Right Sidebar: AI Agent reasoning chat, task plan, code diffs, and embedded Circuit Triage
 * - Bottom Panel: Problems, Build Output, Serial Monitor, Task Logs
 * - Status Bar: Board, port, baud rate, editor line/col, build state, AI state
 *
 * Preserves 100% of existing circuit intake, ranked hypotheses, and multimeter probing logic.
 */

'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import IdeLayout from '../../components/ide/IdeLayout';
import BoardSelector from '../../components/BoardSelector';
import ProblemForm from '../../components/ProblemForm';
import ImageUploader from '../../components/ImageUploader';
import DiagnosisLoading from '../../components/DiagnosisLoading';
import ResultsPanel from '../../components/ResultsPanel';
import MeasurementInput from '../../components/MeasurementInput';
import DemoBanner from '../../components/DemoBanner';
import { validateBoard, validateProblemDescription } from '../../lib/validation';
import { createDiagnosis, submitMultimeterMeasurement } from '../../lib/api';
import { isDemoMode, setDemoMode, getLocalCaseById } from '../../lib/storage';
import { DEMO_SCENARIOS } from '../../lib/mockData';

function WorkspaceContent() {
  const searchParams = useSearchParams();

  // Intake State
  const [selectedBoard, setSelectedBoard] = useState('AI Thinker ESP32-CAM');
  const [components, setComponents] = useState(['Blue LED', '220Ω Resistor']);
  const [pinConnections, setPinConnections] = useState('GPIO 4 -> Flash LED, GPIO 33 -> Status LED');
  const [description, setDescription] = useState(
    'ESP32-CAM onboard flash LED on GPIO 4 draws excessive current and causes brownout reset during Wi-Fi transmission.'
  );
  const [imageFile, setImageFile] = useState(null);

  // Status & Runtime State
  const [isDemo, setIsDemo] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmittingMeasurement, setIsSubmittingMeasurement] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const [apiError, setApiError] = useState(null);

  // Diagnostic Results State
  const [diagnosisResult, setDiagnosisResult] = useState(null);
  const [activeProbingTest, setActiveProbingTest] = useState(null);
  const [showMeasurementModal, setShowMeasurementModal] = useState(false);
  const [measurementsLog, setMeasurementsLog] = useState([]);
  const [eliminatedHypotheses, setEliminatedHypotheses] = useState([]);

  // Initialize from storage & search params
  useEffect(() => {
    setIsDemo(isDemoMode());

    // Check query params
    const boardParam = searchParams.get('board');
    if (boardParam) {
      setSelectedBoard(boardParam);
    }

    const scenarioParam = searchParams.get('scenario');
    if (scenarioParam) {
      const found = DEMO_SCENARIOS.find((s) => s.id === scenarioParam);
      if (found) {
        setSelectedBoard(found.board);
        setDescription(found.description);
        setComponents(found.components || []);
        setPinConnections(found.pinConnections || '');
      }
    }

    const caseIdParam = searchParams.get('caseId');
    if (caseIdParam) {
      const savedCase = getLocalCaseById(caseIdParam);
      if (savedCase) {
        setDiagnosisResult(savedCase);
        if (savedCase.case?.target_board) setSelectedBoard(savedCase.case.target_board);
        if (savedCase.case?.symptom_description) setDescription(savedCase.case.symptom_description);
      }
    }

    function handleDemoChange() {
      setIsDemo(isDemoMode());
    }
    window.addEventListener('circuitsage_demo_mode_changed', handleDemoChange);
    return () => window.removeEventListener('circuitsage_demo_mode_changed', handleDemoChange);
  }, [searchParams]);

  function handleToggleDemo(nextVal) {
    setDemoMode(nextVal);
    setIsDemo(nextVal);
  }

  async function handleRunDiagnosis(e) {
    if (e) e.preventDefault();
    setApiError(null);

    // Client-side validations
    const boardValidation = validateBoard(selectedBoard);
    const descValidation = validateProblemDescription(description);

    const errors = {};
    if (!boardValidation.isValid) errors.board = boardValidation.error;
    if (!descValidation.isValid) errors.description = descValidation.error;

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setFormErrors({});
    setIsLoading(true);

    try {
      const res = await createDiagnosis(
        {
          target_board: selectedBoard,
          symptom_description: description,
          connected_components: components,
          pin_connections: pinConnections,
          image: imageFile
        },
        { isDemo }
      );

      if (!res.success) {
        setApiError(res.error?.message || 'Failed to complete circuit diagnosis.');
        setDiagnosisResult(null);
      } else {
        setDiagnosisResult(res.data);
        setMeasurementsLog([]);
        setEliminatedHypotheses([]);
      }
    } catch (err) {
      setApiError(err.message || 'An unexpected error occurred during diagnosis.');
    } finally {
      setIsLoading(false);
    }
  }

  function handleTriggerProbing(test) {
    setActiveProbingTest(test);
    setShowMeasurementModal(true);
  }

  async function handleSubmitMeasurement(measurementPayload) {
    setIsSubmittingMeasurement(true);
    try {
      const caseId = diagnosisResult?.case?.id || 'demo-active-case';
      const res = await submitMultimeterMeasurement(caseId, measurementPayload, {
        isDemo,
        currentCase: diagnosisResult
      });

      if (res.success && res.data) {
        // Append measurement
        setMeasurementsLog((prev) => [res.data.measurement, ...prev]);

        // Append eliminated hypotheses
        if (res.data.eliminated_hypotheses && res.data.eliminated_hypotheses.length > 0) {
          setEliminatedHypotheses((prev) => [...res.data.eliminated_hypotheses, ...prev]);
        }

        // Update active hypotheses in diagnosis
        if (res.data.updated_hypotheses) {
          setDiagnosisResult((prev) => ({
            ...prev,
            hypotheses: res.data.updated_hypotheses,
            deterministic_checks: [
              ...(prev.deterministic_checks || []),
              res.data.deterministic_evaluation
            ]
          }));
        }

        setShowMeasurementModal(false);
        setActiveProbingTest(null);
      } else {
        alert(res.error?.message || 'Failed to submit measurement.');
      }
    } finally {
      setIsSubmittingMeasurement(false);
    }
  }

  // Diagnostic Assistant Component rendered in Right Sidebar Triage Tab
  const diagnosticComponent = (
    <div className="space-y-4 text-xs font-mono">
      <DemoBanner isDemo={isDemo} onToggleDemo={handleToggleDemo} />

      {apiError && (
        <div className="p-3 rounded-lg bg-rose-950/60 border border-rose-800 text-rose-200 text-xs space-y-1">
          <div className="font-semibold text-rose-400">⚠️ Request Failed</div>
          <p>{apiError}</p>
        </div>
      )}

      {isLoading ? (
        <DiagnosisLoading onCancel={() => setIsLoading(false)} />
      ) : (
        <div className="space-y-4">
          {/* Intake Form */}
          <form onSubmit={handleRunDiagnosis} className="space-y-3 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
            <BoardSelector
              selectedBoard={selectedBoard}
              onBoardChange={(b) => {
                setSelectedBoard(b);
                setFormErrors((prev) => ({ ...prev, board: null }));
              }}
              components={components}
              onComponentsChange={setComponents}
              pinConnections={pinConnections}
              onPinConnectionsChange={setPinConnections}
              error={formErrors.board}
            />

            <ProblemForm
              description={description}
              onDescriptionChange={(d) => {
                setDescription(d);
                setFormErrors((prev) => ({ ...prev, description: null }));
              }}
              error={formErrors.description}
            />

            <ImageUploader
              file={imageFile}
              onFileChange={setImageFile}
              error={formErrors.image}
            />

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2 px-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium transition-colors shadow-md shadow-blue-600/20"
            >
              ⚡ Run Circuit Diagnosis
            </button>
          </form>

          {/* Measurement Probing Modal */}
          {showMeasurementModal && (
            <MeasurementInput
              initialTest={activeProbingTest}
              onSubmit={handleSubmitMeasurement}
              onCancel={() => {
                setShowMeasurementModal(false);
                setActiveProbingTest(null);
              }}
              isSubmitting={isSubmittingMeasurement}
            />
          )}

          {/* Results Presentation */}
          <ResultsPanel
            diagnosis={diagnosisResult}
            onSelectTestForProbing={handleTriggerProbing}
            measurementsLog={measurementsLog}
            eliminatedHypotheses={eliminatedHypotheses}
          />
        </div>
      )}
    </div>
  );

  return <IdeLayout diagnosticComponent={diagnosticComponent} />;
}

export default function WorkspacePage() {
  return (
    <Suspense
      fallback={
        <div className="h-screen w-screen flex items-center justify-center bg-slate-950 text-slate-500 font-mono text-xs">
          Loading CircuitSage IDE Workspace...
        </div>
      }
    >
      <WorkspaceContent />
    </Suspense>
  );
}

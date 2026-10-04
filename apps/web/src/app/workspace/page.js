/**
 * CircuitSage AI — Main Diagnostic Workspace (Screens 2–8)
 * Houses intake form, problem description, optional circuit photo uploader,
 * board & component selection, engineering loading states, results panel, and multimeter follow-up probing.
 */

'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
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
  const [selectedBoard, setSelectedBoard] = useState('ESP32 DevKit v1');
  const [components, setComponents] = useState(['Blue LED', '220Ω Resistor']);
  const [pinConnections, setPinConnections] = useState('GPIO 18 -> 220Ω Resistor -> LED Anode, GND -> Cathode');
  const [description, setDescription] = useState(
    'Blue 5mm LED connected to GPIO 18 never illuminates when running the blink sketch. Pin should pulse HIGH every second.'
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

  function handleResetWorkspace() {
    setSelectedBoard('ESP32 DevKit v1');
    setComponents([]);
    setPinConnections('');
    setDescription('');
    setImageFile(null);
    setDiagnosisResult(null);
    setFormErrors({});
    setApiError(null);
    setMeasurementsLog([]);
    setEliminatedHypotheses([]);
    setShowMeasurementModal(false);
  }

  return (
    <div className="space-y-6">
      {/* Workspace Header & Demo Notification */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
            <span>🔬</span> Circuit Diagnostic Workspace
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Configure target hardware, describe observed failure symptoms, and inspect ranked electrical hypotheses.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleResetWorkspace}
            className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 text-xs font-mono transition-colors"
          >
            Clear Workspace
          </button>
        </div>
      </div>

      {/* Demo Banner */}
      <DemoBanner isDemo={isDemo} onToggleDemo={handleToggleDemo} />

      {/* API Error Alert */}
      {apiError && (
        <div
          role="alert"
          className="p-4 rounded-xl bg-rose-950/50 border border-rose-800 text-rose-200 text-xs space-y-1 shadow-lg"
        >
          <div className="font-semibold flex items-center gap-1.5 text-rose-400">
            <span>⚠️</span> Diagnostic Request Failed
          </div>
          <p className="text-rose-300">{apiError}</p>
          <div className="pt-1 flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleToggleDemo(true)}
              className="text-[11px] underline font-mono text-rose-400 hover:text-rose-200"
            >
              Switch to Demo Mode to test without backend server
            </button>
          </div>
        </div>
      )}

      {/* Responsive Two-Column Engineering Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Circuit Intake Controls (5 Cols on LG) */}
        <section
          className="lg:col-span-5 space-y-6 bg-slate-900/50 p-5 rounded-2xl border border-slate-800/80"
          aria-label="Circuit Intake Section"
        >
          <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
            <h2 className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono">
              1. Hardware & Symptom Intake
            </h2>
            <span className="text-[11px] text-slate-500 font-mono">Input Form</span>
          </div>

          <form onSubmit={handleRunDiagnosis} className="space-y-5">
            {/* Board Selection */}
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

            {/* Problem Description */}
            <ProblemForm
              description={description}
              onDescriptionChange={(d) => {
                setDescription(d);
                setFormErrors((prev) => ({ ...prev, description: null }));
              }}
              error={formErrors.description}
            />

            {/* Circuit Photo Upload */}
            <ImageUploader
              file={imageFile}
              onFileChange={setImageFile}
              error={formErrors.image}
            />

            {/* Primary Action Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-medium text-xs uppercase tracking-wider transition-all font-mono shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <span className="w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin"></span>
                    <span>Analyzing Circuit Hardware...</span>
                  </>
                ) : (
                  <>
                    <span>⚡ Run Circuit Diagnosis</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </section>

        {/* Right Column: Diagnostic Loading, Results Panel & Multimeter Probing (7 Cols on LG) */}
        <section
          className="lg:col-span-7 space-y-6"
          aria-label="Diagnostic Results and Multimeter Probing Section"
        >
          {isLoading ? (
            <DiagnosisLoading onCancel={() => setIsLoading(false)} />
          ) : (
            <>
              {/* Measurement Input Modal / Inline Form */}
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

              {/* Diagnostic Results Presentation */}
              <ResultsPanel
                diagnosis={diagnosisResult}
                onSelectTestForProbing={handleTriggerProbing}
                measurementsLog={measurementsLog}
                eliminatedHypotheses={eliminatedHypotheses}
              />
            </>
          )}
        </section>
      </div>
    </div>
  );
}

export default function WorkspacePage() {
  return (
    <Suspense
      fallback={
        <div className="p-12 text-center text-xs text-slate-500 font-mono">
          Loading CircuitSage Diagnostic Workspace...
        </div>
      }
    >
      <WorkspaceContent />
    </Suspense>
  );
}

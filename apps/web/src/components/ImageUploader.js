/**
 * CircuitSage AI — Circuit Image Uploader
 * Supports optional circuit photo intake with drag-and-drop, validation, live preview, and removal.
 */

'use client';

import { useState, useRef } from 'react';
import { validateCircuitImage } from '../lib/validation';

export default function ImageUploader({ file, onFileChange, error: externalError }) {
  const [dragActive, setDragActive] = useState(false);
  const [internalError, setInternalError] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const fileInputRef = useRef(null);

  const displayError = externalError || internalError;

  function handleFile(selectedFile) {
    setInternalError(null);
    if (!selectedFile) {
      clearImage();
      return;
    }

    const validation = validateCircuitImage(selectedFile);
    if (!validation.isValid) {
      setInternalError(validation.error);
      return;
    }

    // Generate local preview URL
    const url = URL.createObjectURL(selectedFile);
    setPreviewUrl(url);
    onFileChange(selectedFile);
  }

  function handleDrag(e) {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }

  function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  }

  function clearImage() {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    setInternalError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onFileChange(null);
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider font-mono">
          Circuit Photo (Optional)
        </label>
        <span className="text-xs text-slate-500">Max 10 MB • JPG, PNG, WebP</span>
      </div>

      {!file && !previewUrl ? (
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
            dragActive
              ? 'border-blue-500 bg-blue-950/20'
              : 'border-slate-800 hover:border-slate-700 bg-slate-900/40 hover:bg-slate-900/70'
          }`}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              fileInputRef.current?.click();
            }
          }}
          aria-label="Upload circuit photo dropzone"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0])}
            aria-hidden="true"
          />
          <div className="flex flex-col items-center justify-center gap-2">
            <span className="text-3xl" aria-hidden="true">📷</span>
            <div className="text-xs text-slate-300 font-medium">
              <span className="text-blue-400 font-semibold underline">Click to upload</span> or drag and drop circuit image
            </div>
            <p className="text-[11px] text-slate-500 max-w-xs">
              Clear overhead photos of breadboard wiring, IC orientation notches, and resistor color bands enhance visual inspection.
            </p>
          </div>
        </div>
      ) : (
        /* Image Preview & Details State */
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
          <div className="flex items-start gap-4">
            <div className="relative w-24 h-24 rounded-lg overflow-hidden bg-slate-950 border border-slate-700 shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewUrl}
                alt="Circuit board photograph preview"
                className="w-full h-full object-cover"
              />
            </div>

            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-slate-200 truncate">
                  {file?.name || 'circuit-photo.jpg'}
                </p>
                <button
                  type="button"
                  onClick={clearImage}
                  className="px-2.5 py-1 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 rounded border border-rose-900/60 transition-colors font-mono"
                  aria-label="Remove uploaded circuit photo"
                >
                  ✕ Remove
                </button>
              </div>

              <p className="text-xs text-slate-400 font-mono">
                {file?.size ? `${(file.size / 1024).toFixed(1)} KB` : 'Image ready'} • {file?.type || 'image/jpeg'}
              </p>

              <div className="inline-flex items-center gap-1.5 text-[11px] text-emerald-400 mt-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                <span>Validated for circuit analysis</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Validation Error Message */}
      {displayError && (
        <div role="alert" className="text-xs text-rose-400 flex items-center gap-1.5 pt-1">
          <span>⚠️</span>
          <span>{displayError}</span>
        </div>
      )}
    </div>
  );
}

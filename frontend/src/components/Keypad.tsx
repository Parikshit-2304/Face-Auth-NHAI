import React from 'react';

interface KeypadProps {
  pin: string;
  maxLen?: number;
  onPinChange: (newPin: string) => void;
  onComplete?: (pin: string) => void;
}

export const Keypad: React.FC<KeypadProps> = ({
  pin,
  maxLen = 6,
  onPinChange,
  onComplete
}) => {
  const appendDigit = (digit: string) => {
    if (pin.length < maxLen) {
      const newPin = pin + digit;
      onPinChange(newPin);
      if (newPin.length === maxLen && onComplete) {
        onComplete(newPin);
      }
    }
  };

  const clearLastDigit = () => {
    if (pin.length > 0) {
      onPinChange(pin.slice(0, -1));
    }
  };

  const clearAll = () => {
    onPinChange('');
  };

  const digits = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-[320px] mx-auto">
      {/* PIN Indicator Dots */}
      <div className="flex gap-4 justify-center py-2" id="pin-container">
        {Array.from({ length: maxLen }).map((_, index) => (
          <div
            key={index}
            className={`w-4 h-4 rounded-full border transition-all duration-200 ${
              index < pin.length
                ? 'bg-primary border-primary scale-110 shadow-sm'
                : 'bg-surface-container-highest border-outline-variant'
            }`}
          />
        ))}
      </div>

      {/* Grid Keypad */}
      <div className="grid grid-cols-3 gap-3 w-full">
        {digits.map((digit) => (
          <button
            key={digit}
            type="button"
            className="keypad-button h-14 flex items-center justify-center font-semibold text-xl bg-surface-container-low border border-outline-variant rounded-lg hover:bg-surface-container-high transition-all cursor-pointer select-none active:scale-95 text-on-surface"
            onClick={() => appendDigit(digit)}
          >
            {digit}
          </button>
        ))}

        {/* Action Button: Clear/All */}
        <button
          type="button"
          className="keypad-button h-14 flex items-center justify-center font-medium text-sm text-error bg-error-container/20 border border-error/20 rounded-lg hover:bg-error-container/40 transition-all cursor-pointer select-none active:scale-95"
          onClick={clearLastDigit}
          onDoubleClick={clearAll}
        >
          <span className="material-symbols-outlined select-none">backspace</span>
        </button>

        {/* Zero */}
        <button
          type="button"
          className="keypad-button h-14 flex items-center justify-center font-semibold text-xl bg-surface-container-low border border-outline-variant rounded-lg hover:bg-surface-container-high transition-all cursor-pointer select-none active:scale-95 text-on-surface"
          onClick={() => appendDigit('0')}
        >
          0
        </button>

        {/* Biometrics Shortcut (Face / Fingerprint) */}
        <button
          type="button"
          className="keypad-button h-14 flex items-center justify-center font-medium text-sm text-primary bg-primary-fixed border border-primary/20 rounded-lg hover:bg-primary-fixed-dim transition-all cursor-pointer select-none active:scale-95"
          onClick={() => {
            // Emulate biometric bypass for dev preview
            if (onComplete) onComplete('123456');
          }}
        >
          <span className="material-symbols-outlined select-none text-[26px]">fingerprint</span>
        </button>
      </div>
    </div>
  );
};

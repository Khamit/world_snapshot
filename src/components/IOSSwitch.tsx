// world_snapshot/src/components/IOSSwitch.tsx
interface IOSSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  leftLabel?: string;
  rightLabel?: string;
  disabled?: boolean;
}

export default function IOSSwitch({ 
  checked, 
  onChange, 
  leftLabel = "Local", 
  rightLabel = "Server",
  disabled = false 
}: IOSSwitchProps) {
  return (
    <div className="flex items-center gap-2">
      <span className={`text-xs transition-colors ${!checked ? 'text-cyan-400 font-medium' : 'text-gray-500'}`}>
        {leftLabel}
      </span>
      <button
        onClick={() => !disabled && onChange(!checked)}
        disabled={disabled}
        className={`
          relative inline-flex items-center h-6 rounded-full w-11 transition-all duration-300
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          ${checked ? 'bg-cyan-600' : 'bg-slate-600'}
        `}
      >
        <span
          className={`
            inline-block w-4 h-4 transform bg-white rounded-full transition-transform duration-300
            ${checked ? 'translate-x-6' : 'translate-x-1'}
          `}
        />
      </button>
      <span className={`text-xs transition-colors ${checked ? 'text-cyan-400 font-medium' : 'text-gray-500'}`}>
        {rightLabel}
      </span>
    </div>
  );
}
export default function Brand({ size = 32, ...props }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden="true" {...props}>
      <path
        d="M8 14h30M23 14v37M53 25a15 15 0 1 0 0 23V37H41"
        stroke="currentColor"
        strokeWidth="7"
        strokeLinecap="square"
        strokeLinejoin="miter"
      />
    </svg>
  )
}

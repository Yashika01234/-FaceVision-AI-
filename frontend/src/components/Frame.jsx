// The app's signature element: a viewfinder with corner brackets.
// Brackets are muted while waiting and turn amber once faces are found,
// matching the boxes drawn on the detections themselves.
export default function Frame({ locked = false, className = "", children }) {
  const color = locked ? "border-detect" : "border-line";
  const corner = `pointer-events-none absolute h-7 w-7 transition-colors duration-300 ${color}`;
  return (
    <div className={`relative rounded-xl bg-panel/70 p-4 ${className}`}>
      <span aria-hidden className={`${corner} left-0 top-0 rounded-tl-xl border-l-2 border-t-2`} />
      <span aria-hidden className={`${corner} right-0 top-0 rounded-tr-xl border-r-2 border-t-2`} />
      <span aria-hidden className={`${corner} bottom-0 left-0 rounded-bl-xl border-b-2 border-l-2`} />
      <span aria-hidden className={`${corner} bottom-0 right-0 rounded-br-xl border-b-2 border-r-2`} />
      {children}
    </div>
  );
}

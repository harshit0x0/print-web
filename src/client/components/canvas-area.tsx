import { useRef, useEffect } from "preact/hooks";
import { useEditor } from "../context";
import { PageCanvas } from "./page-canvas";

export function CanvasArea() {
  const { canvasWidth, canvasHeight, zoom, setZoomRaw, setFitScale } = useEditor();
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Calculate fit scale on mount
  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    const padding = 120;
    const availW = wrapper.clientWidth - padding;
    const fit = Math.min(availW / canvasWidth, 1);
    setFitScale(fit);
    setZoomRaw(0.58);
  }, [canvasWidth, canvasHeight]);

  // Recalculate on resize
  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    const obs = new ResizeObserver(() => {
      const padding = 120;
      const availW = wrapper.clientWidth - padding;
      const fit = Math.min(availW / canvasWidth, 1);
      setFitScale(fit);
    });
    obs.observe(wrapper);
    return () => obs.disconnect();
  }, [canvasWidth, canvasHeight]);

  // Cmd+wheel zoom towards mouse position
  const zoomRef = useRef(zoom);
  useEffect(() => { zoomRef.current = zoom; }, [zoom]);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    const handler = (e: WheelEvent) => {
      if (!(e.metaKey || e.ctrlKey)) return;
      e.preventDefault();
      const prevZoom = zoomRef.current;
      const factor = e.deltaY > 0 ? 0.95 : 1.05;
      const newZoom = Math.min(Math.max(prevZoom * factor, 0.05), 3);

      // Mouse position relative to scroll container
      const rect = wrapper.getBoundingClientRect();
      const mouseX = e.clientX - rect.left + wrapper.scrollLeft;
      const mouseY = e.clientY - rect.top + wrapper.scrollTop;

      // Adjust scroll to keep point under mouse stable
      const scale = newZoom / prevZoom;
      wrapper.scrollLeft = mouseX * scale - (e.clientX - rect.left);
      wrapper.scrollTop = mouseY * scale - (e.clientY - rect.top);

      setZoomRaw(newZoom);
    };
    wrapper.addEventListener("wheel", handler, { passive: false });
    return () => wrapper.removeEventListener("wheel", handler);
  }, [setZoomRaw]);

  return (
    <div
      ref={wrapperRef}
      class="flex-1 overflow-auto"
      style={{ background: "#E8EAEF" }}
    >
      <div
        style={{
          width: Math.max((canvasWidth + 80) * zoom, wrapperRef.current?.clientWidth ?? 0),
          minHeight: "100%",
          display: "flex",
          justifyContent: "center",
        }}
      >
        <div
          class="flex flex-col items-center"
          style={{
            transform: `scale(${zoom})`,
            transformOrigin: "center top",
            padding: "40px 40px 80px",
          }}
        >
          {/* Single canvas — no page loop, no page headers */}
          <PageCanvas width={canvasWidth} height={canvasHeight} />
        </div>
      </div>
    </div>
  );
}

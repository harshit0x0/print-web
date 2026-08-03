import { useState, useCallback, useRef, useEffect } from "preact/hooks";
import * as fabric from "fabric";
import type { Template } from "../types";

const MAX_HISTORY = 50;

const TEXT_PRESETS = {
  heading: { text: "Add a heading", fontSize: 48, fontWeight: "700", fontFamily: "Montserrat" },
  subheading: { text: "Add a subheading", fontSize: 32, fontWeight: "500", fontFamily: "Inter" },
  body: { text: "Add body text", fontSize: 18, fontWeight: "400", fontFamily: "Inter" },
} as const;

const SHAPE_DEFAULTS = {
  fill: "#6366f1",
  stroke: "",
  strokeWidth: 0,
  opacity: 1,
};

interface CanvasHistory {
  entries: string[];
  index: number;
}

export function useCanvasState() {
  // ── Single canvas state (MVP — no multi-page) ────────────────────
  const canvasRef = useRef<fabric.Canvas | null>(null);
  const historyRef = useRef<CanvasHistory>({ entries: [], index: -1 });
  const [selectedObject, setSelectedObject] = useState<fabric.FabricObject | null>(null);
  const [canvasWidth, setCanvasWidth] = useState(1080);
  const [canvasHeight, setCanvasHeight] = useState(1080);
  const [zoom, setZoom] = useState(0.58);
  const [fitScale, setFitScale] = useState(0.58);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const isRestoringRef = useRef(false);

  // ── Helpers ───────────────────────────────────────────────────────

  const getActiveCanvas = useCallback((): fabric.Canvas | null => {
    return canvasRef.current;
  }, []);

  const updateUndoRedoState = useCallback(() => {
    const hist = historyRef.current;
    setCanUndo(hist.index > 0);
    setCanRedo(hist.index < hist.entries.length - 1);
  }, []);

  const saveHistory = useCallback(() => {
    if (isRestoringRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const json = JSON.stringify(canvas.toJSON());
    const hist = historyRef.current;
    // Truncate forward history
    hist.entries = hist.entries.slice(0, hist.index + 1);
    hist.entries.push(json);
    if (hist.entries.length > MAX_HISTORY) {
      hist.entries.shift();
    } else {
      hist.index = hist.entries.length - 1;
    }
    updateUndoRedoState();
  }, [updateUndoRedoState]);

  // ── Register/unregister (single canvas) ──────────────────────────

  const registerCanvas = useCallback((canvas: fabric.Canvas) => {
    canvasRef.current = canvas;

    // Selection events
    canvas.on("selection:created", (e) => {
      setSelectedObject(e.selected?.[0] ?? null);
    });
    canvas.on("selection:updated", (e) => {
      setSelectedObject(e.selected?.[0] ?? null);
    });
    canvas.on("selection:cleared", () => {
      setSelectedObject(null);
    });

    // History events
    canvas.on("object:added", () => saveHistory());
    canvas.on("object:modified", () => saveHistory());
    canvas.on("object:removed", () => saveHistory());

    // Initial history snapshot
    setTimeout(() => {
      const json = JSON.stringify(canvas.toJSON());
      historyRef.current = { entries: [json], index: 0 };
      updateUndoRedoState();
    }, 100);
  }, [saveHistory, updateUndoRedoState]);

  const unregisterCanvas = useCallback(() => {
    canvasRef.current = null;
    historyRef.current = { entries: [], index: -1 };
  }, []);

  // ── Text ──────────────────────────────────────────────────────────

  const addText = useCallback(
    (preset: "heading" | "subheading" | "body") => {
      const canvas = getActiveCanvas();
      if (!canvas) return;
      const cfg = TEXT_PRESETS[preset];
      const text = new fabric.Textbox(cfg.text, {
        left: canvasWidth / 2 - 200,
        top: canvasHeight / 2 - 30,
        width: 400,
        fontSize: cfg.fontSize,
        fontWeight: cfg.fontWeight,
        fontFamily: cfg.fontFamily,
        fill: "#ffffff",
        textAlign: "center",
        editable: true,
      });
      canvas.add(text);
      canvas.setActiveObject(text);
      canvas.requestRenderAll();
    },
    [getActiveCanvas, canvasWidth, canvasHeight]
  );

  // ── Shapes ────────────────────────────────────────────────────────

  const addShape = useCallback(
    (type: "rect" | "circle" | "line" | "triangle") => {
      const canvas = getActiveCanvas();
      if (!canvas) return;
      let obj: fabric.FabricObject;
      const cx = canvasWidth / 2;
      const cy = canvasHeight / 2;

      switch (type) {
        case "rect":
          obj = new fabric.Rect({
            left: cx - 75,
            top: cy - 75,
            width: 150,
            height: 150,
            rx: 8,
            ry: 8,
            ...SHAPE_DEFAULTS,
          });
          break;
        case "circle":
          obj = new fabric.Circle({
            left: cx - 60,
            top: cy - 60,
            radius: 60,
            ...SHAPE_DEFAULTS,
          });
          break;
        case "triangle":
          obj = new fabric.Triangle({
            left: cx - 60,
            top: cy - 60,
            width: 120,
            height: 120,
            ...SHAPE_DEFAULTS,
          });
          break;
        case "line":
          obj = new fabric.Line([cx - 100, cy, cx + 100, cy], {
            stroke: "#6366f1",
            strokeWidth: 3,
            fill: "",
          });
          break;
        default:
          return;
      }
      canvas.add(obj);
      canvas.setActiveObject(obj);
      canvas.requestRenderAll();
    },
    [getActiveCanvas, canvasWidth, canvasHeight]
  );

  // ── Images ────────────────────────────────────────────────────────

  const addImage = useCallback(
    async (url: string) => {
      const canvas = getActiveCanvas();
      if (!canvas) return;
      try {
        const img = await fabric.FabricImage.fromURL(url, { crossOrigin: "anonymous" });
        const scale = Math.min(
          (canvasWidth * 0.6) / (img.width || 1),
          (canvasHeight * 0.6) / (img.height || 1),
          1
        );
        img.set({
          left: canvasWidth / 2 - ((img.width || 0) * scale) / 2,
          top: canvasHeight / 2 - ((img.height || 0) * scale) / 2,
          scaleX: scale,
          scaleY: scale,
        });
        canvas.add(img);
        canvas.setActiveObject(img);
        canvas.requestRenderAll();
      } catch (e) {
        console.error("Failed to load image:", e);
      }
    },
    [getActiveCanvas, canvasWidth, canvasHeight]
  );

  // ── Background ────────────────────────────────────────────────────

  const setBackground = useCallback(
    (type: "color" | "gradient" | "image", value: string) => {
      const canvas = getActiveCanvas();
      if (!canvas) return;
      if (type === "color" || type === "gradient") {
        canvas.backgroundColor = value;
        canvas.requestRenderAll();
        saveHistory();
      } else if (type === "image") {
        fabric.FabricImage.fromURL(value, { crossOrigin: "anonymous" }).then((img) => {
          const scaleX = canvasWidth / (img.width || 1);
          const scaleY = canvasHeight / (img.height || 1);
          img.set({ left: 0, top: 0, scaleX, scaleY, selectable: false, evented: false });
          const objects = canvas.getObjects();
          const bgObj = objects.find((o) => (o as any)._isBgImage);
          if (bgObj) canvas.remove(bgObj);
          (img as any)._isBgImage = true;
          canvas.add(img);
          canvas.sendObjectToBack(img);
          canvas.requestRenderAll();
          saveHistory();
        });
      }
    },
    [getActiveCanvas, canvasWidth, canvasHeight, saveHistory]
  );

  // ── Object manipulation ───────────────────────────────────────────

  const updateSelectedObject = useCallback(
    (props: Record<string, unknown>) => {
      const canvas = getActiveCanvas();
      if (!canvas || !selectedObject) return;
      selectedObject.set(props as Partial<fabric.FabricObject>);
      canvas.requestRenderAll();
      saveHistory();
      setSelectedObject({ ...selectedObject } as fabric.FabricObject);
    },
    [getActiveCanvas, selectedObject, saveHistory]
  );

  const deleteSelected = useCallback(() => {
    const canvas = getActiveCanvas();
    if (!canvas) return;
    const active = canvas.getActiveObjects();
    if (active.length === 0) return;
    active.forEach((obj) => canvas.remove(obj));
    canvas.discardActiveObject();
    canvas.requestRenderAll();
  }, [getActiveCanvas]);

  // ── Undo / Redo ───────────────────────────────────────────────────

  const restoreFromHistory = useCallback(
    (index: number) => {
      const canvas = getActiveCanvas();
      if (!canvas) return;
      const hist = historyRef.current;
      if (index < 0 || index >= hist.entries.length) return;
      isRestoringRef.current = true;
      hist.index = index;
      const json = hist.entries[index];
      canvas.loadFromJSON(JSON.parse(json)).then(() => {
        canvas.requestRenderAll();
        isRestoringRef.current = false;
        updateUndoRedoState();
      });
    },
    [getActiveCanvas, updateUndoRedoState]
  );

  const undo = useCallback(() => {
    const hist = historyRef.current;
    if (hist.index <= 0) return;
    restoreFromHistory(hist.index - 1);
  }, [restoreFromHistory]);

  const redo = useCallback(() => {
    const hist = historyRef.current;
    if (hist.index >= hist.entries.length - 1) return;
    restoreFromHistory(hist.index + 1);
  }, [restoreFromHistory]);

  // ── Canvas size ───────────────────────────────────────────────────

  const setCanvasSize = useCallback(
    (width: number, height: number) => {
      setCanvasWidth(width);
      setCanvasHeight(height);
      const canvas = canvasRef.current;
      if (canvas) {
        const dpr = window.devicePixelRatio || 1;
        canvas.setDimensions({ width: width * dpr, height: height * dpr }, { cssOnly: false });
        canvas.setDimensions({ width, height }, { cssOnly: true });
        canvas.setViewportTransform([dpr, 0, 0, dpr, 0, 0]);
        canvas.requestRenderAll();
      }
    },
    []
  );

  // ── Zoom ──────────────────────────────────────────────────────────

  const zoomToFit = useCallback(() => {
    setZoom(fitScale);
  }, [fitScale]);

  const zoomIn = useCallback(() => {
    setZoom((z) => Math.min(z * 1.2, 3));
  }, []);

  const zoomOut = useCallback(() => {
    setZoom((z) => Math.max(z / 1.2, 0.05));
  }, []);

  // ── Export ────────────────────────────────────────────────────────

  const exportPNG = useCallback(() => {
    const canvas = getActiveCanvas();
    if (!canvas) return;
    const activeObj = canvas.getActiveObject();
    canvas.discardActiveObject();
    canvas.requestRenderAll();

    const dataURL = canvas.toDataURL({
      format: "png",
      multiplier: 2,
      quality: 1,
    });

    const link = document.createElement("a");
    link.download = "design.png";
    link.href = dataURL;
    link.click();

    if (activeObj) {
      canvas.setActiveObject(activeObj);
      canvas.requestRenderAll();
    }
  }, [getActiveCanvas]);

  // ── Serialization ─────────────────────────────────────────────────

  const getCanvasJSON = useCallback(() => {
    const canvas = getActiveCanvas();
    if (!canvas) return "{}";
    return JSON.stringify(canvas.toJSON());
  }, [getActiveCanvas]);

  const loadTemplate = useCallback(
    (template: Template) => {
      setCanvasWidth(template.width);
      setCanvasHeight(template.height);
      const canvas = canvasRef.current;
      if (canvas) {
        const dpr = window.devicePixelRatio || 1;
        canvas.setDimensions(
          { width: template.width * dpr, height: template.height * dpr },
          { cssOnly: false }
        );
        canvas.setDimensions({ width: template.width, height: template.height }, { cssOnly: true });
        canvas.setViewportTransform([dpr, 0, 0, dpr, 0, 0]);

        isRestoringRef.current = true;
        canvas.loadFromJSON(JSON.parse(template.canvas_json)).then(() => {
          canvas.requestRenderAll();
          isRestoringRef.current = false;
          historyRef.current = {
            entries: [JSON.stringify(canvas.toJSON())],
            index: 0,
          };
          updateUndoRedoState();
        });
      }
    },
    [updateUndoRedoState]
  );

  // ── Keyboard shortcuts ────────────────────────────────────────────

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey;
      if (meta && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if (meta && e.key === "z" && e.shiftKey) {
        e.preventDefault();
        redo();
      } else if ((e.key === "Delete" || e.key === "Backspace") && !isTextEditing()) {
        e.preventDefault();
        deleteSelected();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [undo, redo, deleteSelected]);

  function isTextEditing(): boolean {
    const canvas = getActiveCanvas();
    if (!canvas) return false;
    const obj = canvas.getActiveObject();
    return obj instanceof fabric.Textbox && obj.isEditing === true;
  }

  return {
    // Canvas registration (single canvas)
    registerCanvas,
    unregisterCanvas,
    // For backward compat (right-sidebar uses canvas directly)
    get canvas() {
      return getActiveCanvas();
    },
    selectedObject,
    canvasWidth,
    canvasHeight,
    zoom,
    setZoomRaw: setZoom,
    fitScale,
    setFitScale,
    addText,
    addShape,
    addImage,
    setBackground,
    updateSelectedObject,
    deleteSelected,
    undo,
    redo,
    canUndo,
    canRedo,
    setCanvasSize,
    zoomToFit,
    zoomIn,
    zoomOut,
    exportPNG,
    getCanvasJSON,
    loadTemplate,
  };
}

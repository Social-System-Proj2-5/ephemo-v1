"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import Moveable from "react-moveable";
import { useEffect, useMemo, useRef, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";
import type {
  OnDrag,
  OnDragStart,
  OnResize,
  OnResizeStart,
  OnRotate,
  OnRotateStart,
} from "react-moveable";

type BaseId = string;
type AssetType = "image" | "stamp";
type LayerType = "text" | AssetType;
type SaveFormat = "png" | "pdf";
type MaterialSidebarMode = "base" | "assets";

type PdfTextLine = {
  text: string;
  x: number;
  y: number;
  fontSize: number;
  rotation: number;
};

type EphemeraBase = {
  id: BaseId;
  title: string;
  description: string;
  accent: string;
  imageSrc: string;
  imageFit?: "cover" | "contain";
  width: number;
  height: number;
};

type StoredGeneratedTemplate = {
  imageSrc?: string;
  title?: string;
  createdAt?: number;
};

type EphemeraAsset = {
  id: string;
  type: AssetType;
  title: string;
  description: string;
  accent: string;
  mediaSrc?: string;
  label?: string;
  defaultSize: {
    width: number;
    height: number;
  };
};

type EphemeraLayer = {
  id: string;
  type: LayerType;
  assetId?: string;
  text?: string;
  color?: string;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: "500" | "700";
  fontStyle?: "normal" | "italic";
  textAlign?: "left" | "center" | "right";
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  zIndex: number;
};

type InteractionDraft = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
};

type MoveableHandle = {
  updateRect: () => void;
};

type EditorSnapshot = {
  layers: EphemeraLayer[];
  selectedId: string | null;
  selectedBaseId: BaseId;
  nextZIndex: number;
  nextLayerId: number;
};

const bases: EphemeraBase[] = [
  {
    id: "receipt",
    title: "Receipt",
    description: "Receipt template",
    accent: "bg-[#d8c7a8]",
    imageSrc: "/ephemera/templates/template_receipt.png",
    width: 823,
    height: 1086,
  },
  {
    id: "ticket",
    title: "Ticket",
    description: "Ticket template",
    accent: "bg-[#c9d7d2]",
    imageSrc: "/ephemera/templates/template_ticket.png",
    width: 1448,
    height: 1086,
  },
  {
    id: "tag",
    title: "Tag",
    description: "Tag template",
    accent: "bg-[#d5c7da]",
    imageSrc: "/ephemera/templates/template_tag.png",
    width: 813,
    height: 1086,
  },
  {
    id: "admission-ticket",
    title: "Admission",
    description: "Admission ticket template",
    accent: "bg-[#d5baa1]",
    imageSrc: "/ephemera/templates/template_admission_ticket.png",
    width: 1536,
    height: 1024,
  },
  {
    id: "bookmark",
    title: "Bookmark",
    description: "Bookmark template",
    accent: "bg-[#b9c7d8]",
    imageSrc: "/ephemera/templates/template_bookmark.png",
    width: 793,
    height: 1983,
  },
  {
    id: "letter",
    title: "Letter",
    description: "Letter template",
    accent: "bg-[#dad0b9]",
    imageSrc: "/ephemera/templates/template_letter.png",
    width: 1086,
    height: 1448,
  },
  {
    id: "menu",
    title: "Menu",
    description: "Menu template",
    accent: "bg-[#c8d2bc]",
    imageSrc: "/ephemera/templates/template_menu.png",
    width: 1086,
    height: 1448,
  },
  {
    id: "movie",
    title: "Movie",
    description: "Movie template",
    accent: "bg-[#c1c7d6]",
    imageSrc: "/ephemera/templates/template_movie.png",
    width: 1448,
    height: 1086,
  },
  {
    id: "note",
    title: "Note",
    description: "Note template",
    accent: "bg-[#d3c4a7]",
    imageSrc: "/ephemera/templates/template_note.png",
    width: 1085,
    height: 1449,
  },
];

const generatedTemplateStorageKey = "ephemo:generated-template";

const mockAssets: EphemeraAsset[] = [
  {
    id: "stamp-visited",
    type: "stamp",
    title: "Visited",
    description: "訪問記録のスタンプ",
    accent: "bg-[#df8f7b]",
    mediaSrc: "/ephemera/stamps/stamp_visited.png",
    defaultSize: { width: 128, height: 128 },
  },
  {
    id: "stamp-kira-1",
    type: "stamp",
    title: "Kira 1",
    description: "きらめきスタンプ",
    accent: "bg-[#f0c56d]",
    mediaSrc: "/ephemera/stamps/kira1.png",
    defaultSize: { width: 72, height: 72 },
  },
  {
    id: "stamp-kira-2",
    type: "stamp",
    title: "Kira 2",
    description: "きらめきスタンプ",
    accent: "bg-[#f0c56d]",
    mediaSrc: "/ephemera/stamps/kira2.png",
    defaultSize: { width: 72, height: 72 },
  },
  {
    id: "stamp-kira-3",
    type: "stamp",
    title: "Kira 3",
    description: "きらめきスタンプ",
    accent: "bg-[#f0c56d]",
    mediaSrc: "/ephemera/stamps/kira3.png",
    defaultSize: { width: 72, height: 72 },
  },
  {
    id: "stamp-kira-4",
    type: "stamp",
    title: "Kira 4",
    description: "きらめきスタンプ",
    accent: "bg-[#f0c56d]",
    mediaSrc: "/ephemera/stamps/kira4.png",
    defaultSize: { width: 72, height: 72 },
  },
  {
    id: "stamp-kira-5",
    type: "stamp",
    title: "Kira 5",
    description: "きらめきスタンプ",
    accent: "bg-[#f0c56d]",
    mediaSrc: "/ephemera/stamps/kira5.png",
    defaultSize: { width: 72, height: 72 },
  },
  {
    id: "stamp-leaf-1",
    type: "stamp",
    title: "Leaf 1",
    description: "葉っぱスタンプ",
    accent: "bg-[#a9c9a6]",
    mediaSrc: "/ephemera/stamps/leaf1.png",
    defaultSize: { width: 112, height: 112 },
  },
  {
    id: "stamp-leaf-2",
    type: "stamp",
    title: "Leaf 2",
    description: "葉っぱスタンプ",
    accent: "bg-[#a9c9a6]",
    mediaSrc: "/ephemera/stamps/leaf2.png",
    defaultSize: { width: 112, height: 112 },
  },
  {
    id: "stamp-leaf-3",
    type: "stamp",
    title: "Leaf 3",
    description: "葉っぱスタンプ",
    accent: "bg-[#a9c9a6]",
    mediaSrc: "/ephemera/stamps/leaf3.png",
    defaultSize: { width: 112, height: 112 },
  },
  {
    id: "stamp-leaf-4",
    type: "stamp",
    title: "Leaf 4",
    description: "葉っぱスタンプ",
    accent: "bg-[#a9c9a6]",
    mediaSrc: "/ephemera/stamps/leaf4.png",
    defaultSize: { width: 112, height: 112 },
  },
];

const assetTypeLabels: Record<AssetType, string> = {
  image: "画像",
  stamp: "スタンプ",
};

const assetTypeOrder: AssetType[] = ["image", "stamp"];

function clampSize(value: number) {
  return Math.max(36, Math.round(value));
}

function normalizeRotation(value: number) {
  const rounded = Math.round(value);

  if (rounded > 360) {
    return 0;
  }

  if (rounded < 0) {
    return ((rounded % 360) + 360) % 360;
  }

  return rounded;
}

function getAspectLockedSize(
  start: InteractionDraft,
  width: number,
  height: number,
) {
  const ratio = start.width / start.height;
  const candidateWidth = clampSize(width);
  const candidateHeight = clampSize(height);
  const widthDelta = Math.abs(candidateWidth - start.width);
  const heightDelta = Math.abs(candidateHeight - start.height);
  let nextWidth = candidateWidth;
  let nextHeight = Math.round(nextWidth / ratio);

  if (heightDelta > widthDelta) {
    nextHeight = candidateHeight;
    nextWidth = Math.round(nextHeight * ratio);
  }

  if (nextWidth < 36) {
    nextWidth = 36;
    nextHeight = Math.round(nextWidth / ratio);
  }

  if (nextHeight < 36) {
    nextHeight = 36;
    nextWidth = Math.round(nextHeight * ratio);
  }

  return {
    width: nextWidth,
    height: nextHeight,
  };
}

function applyElementLayout(
  target: HTMLElement | SVGElement | null,
  layout: Omit<InteractionDraft, "id">,
) {
  if (!(target instanceof HTMLElement)) {
    return;
  }

  target.style.width = `${layout.width}px`;
  target.style.height = `${layout.height}px`;
  target.style.transform = `translate(${layout.x}px, ${layout.y}px) rotate(${layout.rotation}deg)`;
}

function cloneLayers(items: EphemeraLayer[]) {
  return items.map((item) => ({ ...item }));
}

function loadCanvasImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    if (src.startsWith("http://") || src.startsWith("https://")) {
      image.crossOrigin = "anonymous";
    }
    image.onload = () => {
      resolve(image);
    };
    image.onerror = reject;
    image.src = src;
  });
}

function drawImageCover(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  const sourceRatio = image.naturalWidth / image.naturalHeight;
  const targetRatio = width / height;
  let sourceWidth = image.naturalWidth;
  let sourceHeight = image.naturalHeight;
  let sourceX = 0;
  let sourceY = 0;

  if (sourceRatio > targetRatio) {
    sourceWidth = image.naturalHeight * targetRatio;
    sourceX = (image.naturalWidth - sourceWidth) / 2;
  } else {
    sourceHeight = image.naturalWidth / targetRatio;
    sourceY = (image.naturalHeight - sourceHeight) / 2;
  }

  context.drawImage(
    image,
    sourceX,
    sourceY,
    sourceWidth,
    sourceHeight,
    x,
    y,
    width,
    height,
  );
}

function drawImageContain(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  const scale = Math.min(width / image.naturalWidth, height / image.naturalHeight);
  const drawWidth = image.naturalWidth * scale;
  const drawHeight = image.naturalHeight * scale;

  context.drawImage(
    image,
    x + (width - drawWidth) / 2,
    y + (height - drawHeight) / 2,
    drawWidth,
    drawHeight,
  );
}

function wrapText(
  context: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
) {
  return text
    .split("\n")
    .flatMap((paragraph) => {
      const characters = Array.from(paragraph);
      const lines: string[] = [];
      let line = "";

      characters.forEach((character) => {
        const candidate = `${line}${character}`;

        if (line && context.measureText(candidate).width > maxWidth) {
          lines.push(line);
          line = character;
          return;
        }

        line = candidate;
      });

      return lines.length || line ? [...lines, line] : [""];
    });
}

function sanitizeFileName(value: string) {
  const sanitized = value
    .trim()
    .replace(/[\\/:*?"<>|]/g, "-")
    .replace(/\s+/g, "-");

  return sanitized || "ephemera";
}

function isSupportedTemplateImageSrc(value: string | undefined): value is string {
  if (!value) {
    return false;
  }

  return (
    value.startsWith("data:image/") ||
    value.startsWith("http://") ||
    value.startsWith("https://")
  );
}

function readGeneratedTemplateBase() {
  try {
    const rawTemplate = sessionStorage.getItem(generatedTemplateStorageKey);

    if (!rawTemplate) {
      return null;
    }

    const template = JSON.parse(rawTemplate) as StoredGeneratedTemplate;

    if (!isSupportedTemplateImageSrc(template.imageSrc)) {
      return null;
    }

    return {
      id: `ai-generated-${template.createdAt ?? "latest"}`,
      title: template.title?.trim() || "AI生成エフェメラ",
      description: "AI生成画面から持ち越したテンプレート",
      accent: "bg-[#c9d7d2]",
      imageSrc: template.imageSrc,
      imageFit: "contain",
      width: 1448,
      height: 1086,
    } satisfies EphemeraBase;
  } catch {
    return null;
  }
}

export default function ScrapbookPage() {
  const router = useRouter();
  const [selectedBaseId, setSelectedBaseId] = useState<BaseId>("receipt");
  const [importedBase, setImportedBase] = useState<EphemeraBase | null>(null);
  const [layers, setLayers] = useState<EphemeraLayer[]>([
    {
      id: "text-1",
      type: "text",
      text: "テキスト",
      color: "#2b241f",
      fontSize: 20,
      fontFamily: "serif",
      fontWeight: "700",
      fontStyle: "normal",
      textAlign: "center",
      x: 72,
      y: 64,
      width: 220,
      height: 48,
      rotation: 0,
      zIndex: 1,
    },
  ]);
  const [selectedId, setSelectedId] = useState<string | null>("text-1");
  const [selectedTarget, setSelectedTarget] = useState<HTMLDivElement | null>(
    null,
  );
  const [pendingBaseId, setPendingBaseId] = useState<BaseId | null>(null);
  const [isMaterialSidebarOpen, setIsMaterialSidebarOpen] = useState(false);
  const [materialSidebarMode, setMaterialSidebarMode] =
    useState<MaterialSidebarMode>("assets");
  const [isSelectionToolbarOpen, setIsSelectionToolbarOpen] = useState(false);
  const [expandedAssetTypes, setExpandedAssetTypes] = useState<AssetType[]>([]);
  const [uploadedAssets, setUploadedAssets] = useState<EphemeraAsset[]>([]);
  const [previewAssetId, setPreviewAssetId] = useState<string | null>(null);
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
  const [ephemeraName, setEphemeraName] = useState("");
  const [savedEphemeraName, setSavedEphemeraName] = useState<string | null>(null);
  const [savedEphemeraUrl, setSavedEphemeraUrl] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportingFormat, setExportingFormat] = useState<SaveFormat | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [editingTextLayerId, setEditingTextLayerId] = useState<string | null>(
    null,
  );
  const [nextZIndex, setNextZIndex] = useState(2);
  const [canUndo, setCanUndo] = useState(false);
  const boardRef = useRef<HTMLDivElement | null>(null);
  const imageUploadInputRef = useRef<HTMLInputElement | null>(null);
  const layerRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const moveableRef = useRef<MoveableHandle | null>(null);
  const nextLayerId = useRef(2);
  const nextUploadedAssetId = useRef(1);
  const uploadedObjectUrls = useRef<string[]>([]);
  const resizeStartDraft = useRef<InteractionDraft | null>(null);
  const interactionDraft = useRef<InteractionDraft | null>(null);
  const interactionUndoSnapshot = useRef<EditorSnapshot | null>(null);
  const textEditUndoSnapshot = useRef<EditorSnapshot | null>(null);
  const textEditDraft = useRef<{ id: string; text: string } | null>(null);
  const saveNameInputRef = useRef<HTMLInputElement | null>(null);
  const hasCenteredInitialText = useRef(false);
  const undoStack = useRef<EditorSnapshot[]>([]);

  useEffect(() => {
    const nextBase = readGeneratedTemplateBase();

    if (!nextBase) {
      return;
    }

    queueMicrotask(() => {
      setImportedBase(nextBase);
      setSelectedBaseId(nextBase.id);
    });
  }, []);

  useEffect(() => {
    setSelectedTarget(selectedId ? layerRefs.current[selectedId] ?? null : null);
  }, [selectedId, layers.length]);

  useEffect(() => {
    const board = boardRef.current;

    if (!board || hasCenteredInitialText.current) {
      return;
    }

    function centerInitialText() {
      if (!board || hasCenteredInitialText.current) {
        return;
      }

      const boardWidth = board.clientWidth;
      const boardHeight = board.clientHeight;

      if (!boardWidth || !boardHeight) {
        return;
      }

      hasCenteredInitialText.current = true;
      setLayers((current) =>
        current.map((item) =>
          item.id === "text-1"
            ? {
                ...item,
                x: Math.round((boardWidth - item.width) / 2),
                y: Math.round((boardHeight - item.height) / 2),
              }
            : item,
        ),
      );

      requestAnimationFrame(() => {
        moveableRef.current?.updateRect();
      });
    }

    centerInitialText();

    const observer = new ResizeObserver(centerInitialText);
    observer.observe(board);

    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!isSaveDialogOpen) {
      return;
    }

    requestAnimationFrame(() => {
      saveNameInputRef.current?.focus();
      saveNameInputRef.current?.select();
    });
  }, [isSaveDialogOpen]);

  useEffect(() => {
    const objectUrls = uploadedObjectUrls.current;

    return () => {
      objectUrls.forEach((url) => {
        URL.revokeObjectURL(url);
      });
    };
  }, []);

  const availableBases = useMemo(
    () => (importedBase ? [importedBase, ...bases] : bases),
    [importedBase],
  );
  const selectedBase =
    availableBases.find((base) => base.id === selectedBaseId) ??
    availableBases[0];
  const selectedExportSize = {
    width: selectedBase.width,
    height: selectedBase.height,
  };
  const selectedBaseRatio = selectedBase.width / selectedBase.height;
  const selectedBoardMaxWidth =
    selectedBaseRatio < 1
      ? Math.max(260, Math.round(760 * selectedBaseRatio))
      : 760;
  const pendingBase = pendingBaseId
    ? availableBases.find((base) => base.id === pendingBaseId) ?? null
    : null;

  const assets = useMemo(
    () => [...mockAssets, ...uploadedAssets],
    [uploadedAssets],
  );

  const assetsById = useMemo(
    () => new Map(assets.map((asset) => [asset.id, asset])),
    [assets],
  );

  const assetsByType = useMemo(
    () =>
      assetTypeOrder.reduce<Record<AssetType, EphemeraAsset[]>>(
        (groupedAssets, type) => {
          groupedAssets[type] = assets.filter((asset) => asset.type === type);
          return groupedAssets;
        },
        {
          image: [],
          stamp: [],
        },
      ),
    [assets],
  );

  const previewAsset = previewAssetId
    ? assetsById.get(previewAssetId) ?? null
    : null;
  const selectedLayer = selectedId
    ? layers.find((layer) => layer.id === selectedId) ?? null
    : null;
  const selectedToolbarPosition = selectedLayer
    ? {
        left: `min(max(${Math.round(
          selectedLayer.x + selectedLayer.width / 2,
        )}px, 24px), calc(100% - 24px))`,
        top:
          selectedLayer.y > 88
            ? Math.max(12, selectedLayer.y - 58)
            : selectedLayer.y + selectedLayer.height + 14,
      }
    : undefined;
  const selectedToolbarButtonPosition = selectedLayer
    ? {
        left: `min(max(${Math.round(
          selectedLayer.x + selectedLayer.width + 8,
        )}px, 8px), calc(100% - 56px))`,
        top: Math.max(8, selectedLayer.y - 36),
      }
    : undefined;

  function createSnapshot(currentLayers = layers): EditorSnapshot {
    return {
      layers: cloneLayers(currentLayers),
      selectedId,
      selectedBaseId,
      nextZIndex,
      nextLayerId: nextLayerId.current,
    };
  }

  function pushUndoSnapshot(snapshot = createSnapshot()) {
    undoStack.current = [...undoStack.current, snapshot].slice(-50);
    setCanUndo(true);
  }

  function undoLastAction() {
    const snapshot = undoStack.current.at(-1);

    if (!snapshot) {
      return;
    }

    undoStack.current = undoStack.current.slice(0, -1);
    setLayers(cloneLayers(snapshot.layers));
    setSelectedId(snapshot.selectedId);
    setSelectedBaseId(snapshot.selectedBaseId);
    setSelectedTarget(
      snapshot.selectedId ? layerRefs.current[snapshot.selectedId] ?? null : null,
    );
    setNextZIndex(snapshot.nextZIndex);
    nextLayerId.current = snapshot.nextLayerId;
    resizeStartDraft.current = null;
    interactionDraft.current = null;
    interactionUndoSnapshot.current = null;
    textEditUndoSnapshot.current = null;
    textEditDraft.current = null;
    setEditingTextLayerId(null);
    setCanUndo(undoStack.current.length > 0);

    requestAnimationFrame(() => {
      moveableRef.current?.updateRect();
    });
  }

  function updateLayer(
    id: string,
    changes: Partial<Omit<EphemeraLayer, "id" | "type" | "assetId">>,
  ) {
    setLayers((current) =>
      current.map((item) => (item.id === id ? { ...item, ...changes } : item)),
    );
  }

  function commitInteractionDraft() {
    const draft = interactionDraft.current;

    if (!draft) {
      return;
    }

    const currentItem = layers.find((item) => item.id === draft.id);
    const hasChanged =
      currentItem &&
      (currentItem.x !== draft.x ||
        currentItem.y !== draft.y ||
        currentItem.width !== draft.width ||
        currentItem.height !== draft.height ||
        currentItem.rotation !== normalizeRotation(draft.rotation));

    if (hasChanged) {
      pushUndoSnapshot(interactionUndoSnapshot.current ?? createSnapshot());
    }

    updateLayer(draft.id, {
      x: draft.x,
      y: draft.y,
      width: draft.width,
      height: draft.height,
      rotation: normalizeRotation(draft.rotation),
    });
    interactionDraft.current = null;
    interactionUndoSnapshot.current = null;
  }

  function selectLayer(id: string) {
    setSelectedId(id);
    setSelectedTarget(layerRefs.current[id] ?? null);
    setIsSelectionToolbarOpen(false);
  }

  function clearSelection() {
    setSelectedId(null);
    setSelectedTarget(null);
    setIsSelectionToolbarOpen(false);
  }

  function requestBaseChange(id: BaseId) {
    if (id === selectedBaseId) {
      return;
    }

    setIsMaterialSidebarOpen(false);
    setPendingBaseId(id);
  }

  function confirmBaseChange() {
    if (!pendingBaseId || pendingBaseId === selectedBaseId) {
      setPendingBaseId(null);
      return;
    }

    pushUndoSnapshot();
    setSelectedBaseId(pendingBaseId);
    setPendingBaseId(null);
  }

  function cancelBaseChange() {
    setPendingBaseId(null);
  }

  function addTextLayer() {
    pushUndoSnapshot();

    const id = `text-${nextLayerId.current}`;
    const zIndex = nextZIndex;
    nextLayerId.current += 1;

    setLayers((current) => [
      ...current,
      {
        id,
        type: "text",
        text: "新しいテキスト",
        color: "#2b241f",
        fontSize: 20,
        fontFamily: "serif",
        fontWeight: "700",
        fontStyle: "normal",
        textAlign: "center",
        x: 80 + (current.length % 4) * 18,
        y: 96 + (current.length % 5) * 18,
        width: 220,
        height: 48,
        rotation: 0,
        zIndex,
      },
    ]);
    setSelectedId(id);
    setNextZIndex((value) => value + 1);
    setIsMaterialSidebarOpen(false);
  }

  function addAssetLayer(asset: EphemeraAsset) {
    pushUndoSnapshot();

    const id = `${asset.id}-${nextLayerId.current}`;
    const zIndex = nextZIndex;
    nextLayerId.current += 1;

    setLayers((current) => [
      ...current,
      {
        id,
        type: asset.type,
        assetId: asset.id,
        x: 88 + (current.length % 4) * 22,
        y: 124 + (current.length % 5) * 18,
        width: asset.defaultSize.width,
        height: asset.defaultSize.height,
        rotation: asset.type === "stamp" ? 352 : 0,
        zIndex,
      },
    ]);
    setSelectedId(id);
    setNextZIndex((value) => value + 1);
    setIsMaterialSidebarOpen(false);
  }

  async function uploadImageAssets(files: FileList | null) {
    if (!files?.length) {
      return;
    }

    const imageFiles = Array.from(files).filter((file) =>
      file.type.startsWith("image/"),
    );

    if (imageFiles.length === 0) {
      return;
    }

    const nextAssets = await Promise.all(
      imageFiles.map(
        (file) =>
          new Promise<EphemeraAsset>((resolve) => {
            const mediaSrc = URL.createObjectURL(file);
            const id = `uploaded-image-${nextUploadedAssetId.current}`;
            nextUploadedAssetId.current += 1;
            uploadedObjectUrls.current.push(mediaSrc);

            const image = new Image();
            image.onload = () => {
              const ratio = image.naturalWidth / image.naturalHeight;
              const width = 220;
              const height = Math.max(80, Math.round(width / ratio));

              resolve({
                id,
                type: "image",
                title: file.name.replace(/\.[^.]+$/, ""),
                description: "アップロード画像",
                accent: "bg-[#9fb6c9]",
                mediaSrc,
                defaultSize: { width, height },
              });
            };
            image.onerror = () => {
              resolve({
                id,
                type: "image",
                title: file.name.replace(/\.[^.]+$/, ""),
                description: "アップロード画像",
                accent: "bg-[#9fb6c9]",
                mediaSrc,
                defaultSize: { width: 220, height: 160 },
              });
            };
            image.src = mediaSrc;
          }),
      ),
    );

    setUploadedAssets((current) => [...current, ...nextAssets]);
    setExpandedAssetTypes((current) =>
      current.includes("image") ? current : [...current, "image"],
    );

    if (imageUploadInputRef.current) {
      imageUploadInputRef.current.value = "";
    }
  }

  function deleteSelectedLayer() {
    if (!selectedId) {
      return;
    }

    pushUndoSnapshot();

    delete layerRefs.current[selectedId];
    setLayers((current) => current.filter((item) => item.id !== selectedId));
    clearSelection();
    resizeStartDraft.current = null;
    interactionDraft.current = null;
    textEditUndoSnapshot.current = null;
    textEditDraft.current = null;
    setEditingTextLayerId(null);
  }

  function reorderSelectedLayer(
    direction: "front" | "forward" | "backward" | "back",
  ) {
    if (!selectedId) {
      return;
    }

    const sortedLayers = [...layers].sort(
      (first, second) => first.zIndex - second.zIndex,
    );
    const currentIndex = sortedLayers.findIndex((item) => item.id === selectedId);

    if (currentIndex === -1) {
      return;
    }

    const nextOrder = [...sortedLayers];
    const [selectedItem] = nextOrder.splice(currentIndex, 1);

    if (!selectedItem) {
      return;
    }

    if (direction === "front") {
      nextOrder.push(selectedItem);
    } else if (direction === "back") {
      nextOrder.unshift(selectedItem);
    } else if (direction === "forward") {
      nextOrder.splice(Math.min(currentIndex + 1, nextOrder.length), 0, selectedItem);
    } else {
      nextOrder.splice(Math.max(currentIndex - 1, 0), 0, selectedItem);
    }

    const didMove = nextOrder[currentIndex]?.id !== selectedId;

    if (!didMove) {
      return;
    }

    pushUndoSnapshot();
    setLayers(
      nextOrder.map((item, index) => ({
        ...item,
        zIndex: index + 1,
      })),
    );
    setNextZIndex(nextOrder.length + 1);
  }

  function moveSelectedLayer(deltaX: number, deltaY: number) {
    if (!selectedId) {
      return;
    }

    pushUndoSnapshot();

    setLayers((current) =>
      current.map((item) => {
        if (item.id !== selectedId) {
          return item;
        }

        const nextItem = {
          ...item,
          x: item.x + deltaX,
          y: item.y + deltaY,
        };

        applyElementLayout(layerRefs.current[item.id], nextItem);
        requestAnimationFrame(() => {
          moveableRef.current?.updateRect();
        });

        return nextItem;
      }),
    );
  }

  function updateSelectedText(changes: Partial<EphemeraLayer>) {
    if (!selectedLayer || selectedLayer.type !== "text") {
      return;
    }

    pushUndoSnapshot();
    updateLayer(selectedLayer.id, changes);

    requestAnimationFrame(() => {
      moveableRef.current?.updateRect();
    });
  }

  function beginTextEditing(id: string) {
    const layer = layers.find((item) => item.id === id);

    if (!layer || layer.type !== "text") {
      return;
    }

    selectLayer(id);
    textEditUndoSnapshot.current = createSnapshot();
    textEditDraft.current = { id, text: layer.text ?? "" };
    setEditingTextLayerId(id);

    requestAnimationFrame(() => {
      layerRefs.current[id]
        ?.querySelector<HTMLElement>("[data-text-editor]")
        ?.focus();
      moveableRef.current?.updateRect();
    });
  }

  function commitTextEditing() {
    const snapshot = textEditUndoSnapshot.current;
    const draft = textEditDraft.current;

    if (snapshot && draft) {
      const previousText = snapshot.layers.find(
        (layer) => layer.id === draft.id,
      )?.text;

      if (previousText !== draft.text) {
        pushUndoSnapshot(snapshot);
        updateLayer(draft.id, { text: draft.text });
      }
    }

    textEditUndoSnapshot.current = null;
    textEditDraft.current = null;
    setEditingTextLayerId(null);

    requestAnimationFrame(() => {
      moveableRef.current?.updateRect();
    });
  }

  function changeEditingText(id: string, text: string) {
    textEditDraft.current = { id, text };
  }

  function openSaveDialog() {
    if (editingTextLayerId) {
      commitTextEditing();
    }

    clearSelection();
    setEphemeraName(savedEphemeraName ?? ephemeraName);
    setIsSaveDialogOpen(true);
  }

  function closeSaveDialog() {
    setIsSaveDialogOpen(false);
  }

  async function createEphemeraImageBlob(type: "image/jpeg" | "image/png") {
    const canvas = document.createElement("canvas");
    canvas.width = selectedExportSize.width;
    canvas.height = selectedExportSize.height;

    const context = canvas.getContext("2d");

    if (!context) {
      throw new Error("画像を書き出せませんでした。");
    }

    const boardWidth = boardRef.current?.clientWidth || 760;
    const boardHeight = boardRef.current?.clientHeight || 570;
    const scaleX = selectedExportSize.width / boardWidth;
    const scaleY = selectedExportSize.height / boardHeight;

    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);

    const baseImage = await loadCanvasImage(selectedBase.imageSrc);
    if (selectedBase.imageFit === "contain") {
      drawImageContain(context, baseImage, 0, 0, canvas.width, canvas.height);
    } else {
      context.drawImage(baseImage, 0, 0, canvas.width, canvas.height);
    }

    const sortedLayers = [...layers].sort(
      (first, second) => first.zIndex - second.zIndex,
    );

    for (const layer of sortedLayers) {
      const x = layer.x * scaleX;
      const y = layer.y * scaleY;
      const width = layer.width * scaleX;
      const height = layer.height * scaleY;

      context.save();
      context.translate(x + width / 2, y + height / 2);
      context.rotate((layer.rotation * Math.PI) / 180);

      if (layer.type === "text") {
        const fontSize = (layer.fontSize ?? 20) * scaleY;
        const padding = 8 * scaleX;
        const lineHeight = fontSize * 1.2;
        const maxTextWidth = Math.max(1, width - padding * 2);
        const textAlign = layer.textAlign ?? "center";
        const lines = wrapText(context, layer.text ?? "", maxTextWidth);
        const totalTextHeight = lines.length * lineHeight;
        const firstLineY = -height / 2 + (height - totalTextHeight) / 2 + lineHeight / 2;
        const textX =
          textAlign === "left"
            ? -width / 2 + padding
            : textAlign === "right"
              ? width / 2 - padding
              : 0;

        context.fillStyle = layer.color ?? "#2b241f";
        context.font = `${layer.fontStyle ?? "normal"} ${layer.fontWeight ?? "700"} ${fontSize}px ${layer.fontFamily ?? "serif"}`;
        context.textAlign = textAlign;
        context.textBaseline = "middle";
        context.direction = "ltr";

        lines.forEach((line, index) => {
          context.fillText(line, textX, firstLineY + index * lineHeight);
        });
      } else if (layer.assetId) {
        const asset = assetsById.get(layer.assetId);

        if (asset?.mediaSrc) {
          const image = await loadCanvasImage(asset.mediaSrc);

          if (asset.type === "stamp") {
            drawImageContain(context, image, -width / 2, -height / 2, width, height);
          } else {
            drawImageCover(context, image, -width / 2, -height / 2, width, height);
          }
        }
      }

      context.restore();
    }

    return new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error("画像を書き出せませんでした。"));
            return;
          }

          resolve(blob);
        },
        type,
        type === "image/jpeg" ? 0.92 : undefined,
      );
    });
  }

  function createPdfTextLines(): PdfTextLine[] {
    const boardWidth = boardRef.current?.clientWidth || 760;
    const boardHeight = boardRef.current?.clientHeight || 570;
    const scaleX = selectedExportSize.width / boardWidth;
    const scaleY = selectedExportSize.height / boardHeight;
    const measureCanvas = document.createElement("canvas");
    const measureContext = measureCanvas.getContext("2d");

    if (!measureContext) {
      return [];
    }

    return layers
      .filter((layer) => layer.type === "text")
      .flatMap((layer) => {
        const x = layer.x * scaleX;
        const y = layer.y * scaleY;
        const width = layer.width * scaleX;
        const height = layer.height * scaleY;
        const fontSize = (layer.fontSize ?? 20) * scaleY;
        const padding = 8 * scaleX;
        const lineHeight = fontSize * 1.2;
        const maxTextWidth = Math.max(1, width - padding * 2);
        const textAlign = layer.textAlign ?? "center";
        const rotation = layer.rotation;
        const rotationRadians = (rotation * Math.PI) / 180;
        const cos = Math.cos(rotationRadians);
        const sin = Math.sin(rotationRadians);
        const centerX = x + width / 2;
        const centerY = y + height / 2;
        const textX =
          textAlign === "left"
            ? -width / 2 + padding
            : textAlign === "right"
              ? width / 2 - padding
              : 0;

        measureContext.font = `${layer.fontStyle ?? "normal"} ${layer.fontWeight ?? "700"} ${fontSize}px ${layer.fontFamily ?? "serif"}`;

        const lines = wrapText(measureContext, layer.text ?? "", maxTextWidth);
        const totalTextHeight = lines.length * lineHeight;
        const firstLineY =
          -height / 2 + (height - totalTextHeight) / 2 + lineHeight / 2;

        return lines.map((line, index) => {
          const lineWidth = measureContext.measureText(line).width;
          const alignOffset =
            textAlign === "center"
              ? lineWidth / 2
              : textAlign === "right"
                ? lineWidth
                : 0;
          const localX = textX - alignOffset;
          const localY = firstLineY + index * lineHeight + fontSize * 0.35;
          const canvasX = centerX + localX * cos - localY * sin;
          const canvasY = centerY + localX * sin + localY * cos;

          return {
            text: line,
            x: canvasX,
            y: selectedExportSize.height - canvasY,
            fontSize,
            rotation: -rotation,
          };
        });
      });
  }

  async function saveEphemera(format: SaveFormat) {
    const trimmedName = ephemeraName.trim();

    if (!trimmedName) {
      return;
    }

    setIsExporting(true);
    setExportingFormat(format);
    setExportError(null);

    try {
      const supabase = getSupabaseClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        throw new Error("ログインが必要です。");
      }

      const imageBlob = await createEphemeraImageBlob(
        format === "pdf" ? "image/jpeg" : "image/png",
      );
      const formData = new FormData();
      formData.append("name", trimmedName);
      formData.append("format", format);
      formData.append("width", String(selectedExportSize.width));
      formData.append("height", String(selectedExportSize.height));
      formData.append(
        "file",
        imageBlob,
        `${sanitizeFileName(trimmedName)}.${format === "pdf" ? "jpg" : "png"}`,
      );

      if (format === "pdf") {
        formData.append("textLayers", JSON.stringify(createPdfTextLines()));
      }

      const response = await fetch("/api/ephemera/save-image", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const result = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;

        throw new Error(result?.error ?? "保存に失敗しました。");
      }

      const result = (await response.json()) as { url?: string };

      setSavedEphemeraName(trimmedName);
      setSavedEphemeraUrl(result.url ?? null);
      setIsSaveDialogOpen(false);
      router.push("/ephemera");
    } catch (error) {
      setExportError(
        error instanceof Error
          ? error.message
          : "保存に失敗しました。もう一度試してください。",
      );
    } finally {
      setIsExporting(false);
      setExportingFormat(null);
    }
  }

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const target = event.target;
      const isTyping =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        target instanceof HTMLButtonElement ||
        (target instanceof HTMLElement && target.isContentEditable);

      if (previewAssetId) {
        if (event.key === "Escape") {
          event.preventDefault();
          setPreviewAssetId(null);
        }

        return;
      }

      if (isSaveDialogOpen) {
        if (event.key === "Escape") {
          event.preventDefault();
          closeSaveDialog();
        }

        return;
      }

      if (pendingBase) {
        if (event.key === "Escape") {
          event.preventDefault();
          cancelBaseChange();
        }

        return;
      }

      if (isMaterialSidebarOpen) {
        if (event.key === "Escape") {
          event.preventDefault();
          setIsMaterialSidebarOpen(false);
        }

        return;
      }

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") {
        event.preventDefault();
        undoLastAction();
        return;
      }

      if (isTyping || !selectedId) {
        return;
      }

      if (event.key === "Delete" || event.key === "Backspace") {
        event.preventDefault();
        deleteSelectedLayer();
        return;
      }

      const distance = event.shiftKey ? 10 : 1;
      const movementByKey: Record<string, [number, number]> = {
        ArrowUp: [0, -distance],
        ArrowDown: [0, distance],
        ArrowLeft: [-distance, 0],
        ArrowRight: [distance, 0],
      };
      const movement = movementByKey[event.key];

      if (!movement) {
        return;
      }

      event.preventDefault();
      moveSelectedLayer(movement[0], movement[1]);
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  });

  return (
    <main className="min-h-screen bg-[#f7f4ef] px-5 py-6 text-stone-950 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 flex items-center justify-between gap-3 border-b border-stone-300 pb-4">
          <div className="min-w-0">
            <p className="text-sm font-medium text-emerald-700">Create</p>
            <h1 className="text-2xl font-semibold tracking-normal">
              エフェメラ作成
            </h1>
          </div>
          <Link
            href="/"
            className="shrink-0 rounded-md border border-stone-300 bg-white px-4 py-2 text-sm font-medium transition hover:bg-stone-100"
          >
            ホーム
          </Link>
        </header>

        {isMaterialSidebarOpen && (
          <button
            type="button"
            aria-label="素材パネルを閉じる"
            className="fixed inset-0 z-30 bg-stone-950/35"
            onClick={() => {
              clearSelection();
              setIsMaterialSidebarOpen(false);
            }}
          />
        )}

        <div className="grid gap-5">
          <aside
            className={`space-y-4 ${
              isMaterialSidebarOpen
                ? "fixed inset-y-0 left-0 z-40 block w-[min(86vw,360px)] overflow-y-auto bg-[#f7f4ef] p-4 shadow-2xl"
                : "hidden"
            }`}
          >
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-base font-semibold">
                {materialSidebarMode === "base" ? "ベース変更" : "素材を追加"}
              </h2>
              <button
                type="button"
                onClick={() => {
                  setIsMaterialSidebarOpen(false);
                }}
                className="rounded-md border border-stone-300 bg-white px-3 py-2 text-sm font-medium transition hover:bg-stone-100"
              >
                閉じる
              </button>
            </div>
            {materialSidebarMode === "base" && (
            <section className="rounded-lg border border-stone-300 bg-white p-5 shadow-sm">
              <div className="flex items-end justify-between">
                <div>
                  <h2 className="text-lg font-semibold">ベース素材</h2>
                  <p className="hidden">
                    エフェメラの土台になる紙片を選択
                  </p>
                </div>
                <span className="hidden">
                  {availableBases.length}件
                </span>
              </div>

              <div className="mt-4 grid grid-cols-4 gap-2">
                {availableBases.map((base) => {
                  const isSelected = selectedBaseId === base.id;

                  return (
                    <button
                      key={base.id}
                      type="button"
                      onClick={() => {
                        requestBaseChange(base.id);
                      }}
                      title={base.title}
                      className={`group relative aspect-square overflow-hidden rounded-md border bg-white transition ${
                        isSelected
                          ? "border-emerald-700 ring-2 ring-emerald-600"
                          : "border-stone-200 hover:border-emerald-700"
                      }`}
                      aria-label={`${base.title}を選択`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={base.imageSrc}
                        alt=""
                        className={`h-full w-full transition group-hover:scale-[1.03] ${
                          base.imageFit === "contain"
                            ? "object-contain"
                            : "object-cover"
                        }`}
                        draggable={false}
                      />
                      {isSelected && (
                        <span className="absolute inset-x-1 bottom-1 rounded bg-emerald-700 px-1 py-0.5 text-center text-[10px] font-medium text-white">
                          選択中
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </section>
            )}

            {materialSidebarMode === "assets" && (
            <section className="rounded-lg border border-stone-300 bg-white p-5 shadow-sm">
              <div className="flex items-end justify-between">
                <div>
                  <h2 className="text-lg font-semibold">配置素材</h2>
                  <p className="hidden">
                    画像とスタンプを選んで重ねる
                  </p>
                </div>
                <span className="hidden">
                  {assets.length}件
                </span>
              </div>

              <button
                type="button"
                onClick={addTextLayer}
                className="mt-4 w-full rounded-md bg-emerald-700 px-4 py-3 text-sm font-medium text-white transition hover:bg-emerald-800"
              >
                テキストを追加
              </button>

              <input
                ref={imageUploadInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={(event) => {
                  void uploadImageAssets(event.target.files);
                }}
                className="hidden"
              />

              <div className="mt-4 space-y-2">
                {assetTypeOrder.map((type) => {
                  const categoryAssets = assetsByType[type];
                  const isExpanded = expandedAssetTypes.includes(type);

                  return (
                    <div
                      key={type}
                      className="overflow-hidden rounded-md border border-stone-200 bg-white"
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setExpandedAssetTypes((current) =>
                            current.includes(type)
                              ? current.filter((item) => item !== type)
                              : [...current, type],
                          );
                        }}
                        className={`flex w-full items-center justify-between gap-3 px-3 py-3 text-left transition ${
                          isExpanded ? "bg-stone-100" : "hover:bg-stone-50"
                        }`}
                        aria-expanded={isExpanded}
                      >
                        <span className="flex min-w-0 items-center gap-3">
                          <span
                            className={`h-3 w-3 shrink-0 rounded-full ${
                              assets.find((asset) => asset.type === type)
                                ?.accent ?? "bg-stone-300"
                            }`}
                          />
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-semibold">
                              {assetTypeLabels[type]}
                            </span>
                            <span className="hidden">
                              {categoryAssets.length}件
                            </span>
                          </span>
                        </span>
                        <span
                          className={`text-sm text-stone-500 transition ${
                            isExpanded ? "rotate-90" : ""
                          }`}
                        >
                          &gt;
                        </span>
                      </button>

                      {isExpanded && (
                        <div className="space-y-2 border-t border-stone-200 bg-stone-50 p-2">
                          <div
                            className={`grid gap-2 ${
                              type === "stamp" ? "grid-cols-5" : "grid-cols-4"
                            }`}
                          >
                            {type === "image" && (
                              <button
                                type="button"
                                onClick={() => {
                                  imageUploadInputRef.current?.click();
                                }}
                                className="flex aspect-square w-full items-center justify-center rounded-md border border-dashed border-stone-300 bg-white text-2xl font-medium text-stone-500 transition hover:border-emerald-700 hover:text-emerald-700"
                                aria-label="画像をアップロード"
                              >
                                +
                              </button>
                            )}
                            {categoryAssets.map((asset) => {
                              const isPreviewed = previewAssetId === asset.id;

                              return (
                                <button
                                  key={asset.id}
                                  type="button"
                                  onClick={() => {
                                    setPreviewAssetId(asset.id);
                                    setIsMaterialSidebarOpen(false);
                                  }}
                                  className={`aspect-square w-full overflow-hidden rounded-md border bg-white transition hover:bg-stone-100 ${
                                    isPreviewed
                                      ? "border-emerald-700 ring-2 ring-emerald-600"
                                      : "border-stone-200"
                                  }`}
                                  aria-label={`${asset.title}を表示`}
                                >
                                  {asset.mediaSrc ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                      src={asset.mediaSrc}
                                      alt=""
                                      className={`h-full w-full ${
                                        asset.type === "stamp"
                                          ? "object-contain p-2"
                                          : "object-cover"
                                      }`}
                                      draggable={false}
                                    />
                                  ) : (
                                    <span
                                      className={`flex h-full w-full items-center justify-center px-1 text-center text-[10px] font-bold leading-3 text-stone-950 ${asset.accent}`}
                                    >
                                      {asset.label}
                                    </span>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
            )}
          </aside>

          <section className="min-w-0">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold">編集キャンバス</h2>
                <p className="mt-1 text-sm text-stone-500">
                  ベース: {selectedBase.title} / レイヤー: {layers.length}件
                  {savedEphemeraName ? ` / 名前: ${savedEphemeraName}` : ""}
                </p>
                {savedEphemeraUrl && (
                  <a
                    href={savedEphemeraUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 inline-block text-sm font-medium text-emerald-700 underline-offset-4 hover:underline"
                  >
                    保存先を開く
                  </a>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    clearSelection();
                    setMaterialSidebarMode("base");
                    setIsMaterialSidebarOpen(true);
                  }}
                  className="rounded-md border border-stone-300 bg-white px-4 py-2 text-sm font-medium transition hover:bg-stone-100"
                >
                  ベース変更
                </button>
                <button
                  type="button"
                  onClick={() => {
                    clearSelection();
                    setMaterialSidebarMode("assets");
                    setIsMaterialSidebarOpen(true);
                  }}
                  className="rounded-md border border-stone-300 bg-white px-4 py-2 text-sm font-medium transition hover:bg-stone-100"
                >
                  追加
                </button>
                <button
                  type="button"
                  onClick={undoLastAction}
                  disabled={!canUndo}
                  className="rounded-md border border-stone-300 bg-white px-4 py-2 text-sm font-medium transition hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  戻す
                </button>
                <button
                  type="button"
                  onClick={openSaveDialog}
                  className="rounded-md bg-emerald-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-800"
                >
                  保存
                </button>
              </div>
            </div>

            <div
              className="relative min-h-[640px] overflow-auto rounded-md border border-dashed border-stone-300 bg-[#fbfaf7] p-3 sm:p-8"
              onMouseDown={(event) => {
                if (event.currentTarget === event.target) {
                  clearSelection();
                }
              }}
            >
              <div
                ref={boardRef}
                className="relative mx-auto w-full overflow-hidden rounded-md border border-stone-300 bg-white shadow-md"
                style={{
                  aspectRatio: `${selectedBase.width} / ${selectedBase.height}`,
                  maxWidth: selectedBoardMaxWidth,
                }}
                onMouseDown={(event) => {
                  if (event.currentTarget === event.target) {
                    clearSelection();
                  }
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={selectedBase.imageSrc}
                  alt=""
                  className={`pointer-events-none absolute inset-0 h-full w-full ${
                    selectedBase.imageFit === "contain"
                      ? "object-contain"
                      : "object-fill"
                  }`}
                  draggable={false}
                />

                {layers.map((item) => {
                  const asset = item.assetId ? assetsById.get(item.assetId) : null;
                  const isSelected = selectedId === item.id;
                  const isEditingText = editingTextLayerId === item.id;

                  return (
                    <div
                      key={item.id}
                      ref={(element) => {
                        layerRefs.current[item.id] = element;
                      }}
                      role="button"
                      tabIndex={0}
                      onClick={(event) => {
                        event.stopPropagation();
                        selectLayer(item.id);
                      }}
                      onDoubleClick={(event) => {
                        event.stopPropagation();
                        beginTextEditing(item.id);
                      }}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          selectLayer(item.id);
                        }
                      }}
                      className={`absolute outline-none ${
                        isEditingText ? "cursor-text" : "cursor-move select-none"
                      } ${
                        isSelected
                          ? "ring-2 ring-emerald-600 ring-offset-2"
                          : "ring-0"
                      }`}
                      style={{
                        left: 0,
                        top: 0,
                        width: item.width,
                        height: item.height,
                        zIndex: item.zIndex,
                        transform: `translate(${item.x}px, ${item.y}px) rotate(${item.rotation}deg)`,
                      }}
                    >
                      {item.type === "text" ? (
                        <div
                          data-text-editor
                          contentEditable={isEditingText}
                          suppressContentEditableWarning
                          onMouseDown={(event) => {
                            if (isEditingText) {
                              event.stopPropagation();
                            }
                          }}
                          onClick={(event) => {
                            if (isEditingText) {
                              event.stopPropagation();
                            }
                          }}
                          onKeyDown={(event) => {
                            if (isEditingText) {
                              event.stopPropagation();
                            }
                          }}
                          onInput={(event) => {
                            changeEditingText(
                              item.id,
                              event.currentTarget.innerText,
                            );
                          }}
                          onBlur={commitTextEditing}
                          className={`flex h-full w-full items-center overflow-hidden rounded-sm px-2 leading-tight outline-none ${
                            isEditingText
                              ? "bg-white/35 ring-1 ring-emerald-700/50"
                              : ""
                          }`}
                          style={{
                            color: item.color,
                            fontSize: item.fontSize,
                            fontFamily: item.fontFamily,
                            fontWeight: item.fontWeight,
                            fontStyle: item.fontStyle,
                            textAlign: item.textAlign,
                            justifyContent:
                              item.textAlign === "right"
                                ? "flex-end"
                                : item.textAlign === "center"
                                  ? "center"
                                  : "flex-start",
                            whiteSpace: "pre-wrap",
                          }}
                        >
                          {item.text}
                        </div>
                      ) : asset?.mediaSrc ? (
                        <div
                          className={`h-full w-full overflow-hidden rounded-md ${
                            asset.type === "stamp"
                              ? "bg-transparent"
                              : "border border-white/70 bg-white shadow-sm"
                          }`}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={asset.mediaSrc}
                            alt={asset.title}
                            className={`h-full w-full ${
                              asset.type === "stamp"
                                ? "object-contain"
                                : "object-cover"
                            }`}
                            draggable={false}
                          />
                        </div>
                      ) : (
                        <div
                          className={`flex h-full w-full items-center justify-center rounded-md border border-stone-950/15 px-2 text-center text-sm font-black tracking-normal text-stone-950 shadow-sm ${asset?.accent ?? "bg-stone-200"}`}
                        >
                          {asset?.label}
                        </div>
                      )}
                    </div>
                  );
                })}

                {selectedTarget && (
                  <Moveable
                    ref={(instance) => {
                      moveableRef.current = instance;
                    }}
                    target={selectedTarget}
                    draggable={!editingTextLayerId}
                    resizable
                    rotatable
                    origin={false}
                    keepRatio={selectedLayer?.type !== "text"}
                    throttleDrag={0}
                    throttleResize={0}
                    throttleRotate={0}
                    renderDirections={[
                      "nw",
                      "n",
                      "ne",
                      "w",
                      "e",
                      "sw",
                      "s",
                      "se",
                    ]}
                    onDragStart={({ set }: OnDragStart) => {
                      setIsSelectionToolbarOpen(false);

                      if (!selectedId) {
                        return;
                      }

                      const selectedItem = layers.find(
                        (draft) => draft.id === selectedId,
                      );

                      if (!selectedItem) {
                        return;
                      }

                      interactionDraft.current = {
                        id: selectedItem.id,
                        x: selectedItem.x,
                        y: selectedItem.y,
                        width: selectedItem.width,
                        height: selectedItem.height,
                        rotation: selectedItem.rotation,
                      };
                      interactionUndoSnapshot.current = createSnapshot();
                      set([selectedItem.x, selectedItem.y]);
                    }}
                    onDrag={({ target, beforeTranslate }: OnDrag) => {
                      const draft = interactionDraft.current;

                      if (!draft) {
                        return;
                      }

                      const nextLayout = {
                        x: Math.round(beforeTranslate[0]),
                        y: Math.round(beforeTranslate[1]),
                        width: draft.width,
                        height: draft.height,
                        rotation: draft.rotation,
                      };

                      interactionDraft.current = {
                        id: draft.id,
                        ...nextLayout,
                      };
                      applyElementLayout(target, nextLayout);
                    }}
                    onDragEnd={commitInteractionDraft}
                    onResizeStart={({ set }: OnResizeStart) => {
                      if (!selectedId) {
                        return;
                      }

                      const selectedItem = layers.find(
                        (draft) => draft.id === selectedId,
                      );

                      if (!selectedItem) {
                        return;
                      }

                      const draft = {
                        id: selectedItem.id,
                        x: selectedItem.x,
                        y: selectedItem.y,
                        width: selectedItem.width,
                        height: selectedItem.height,
                        rotation: selectedItem.rotation,
                      };

                      resizeStartDraft.current = draft;
                      interactionDraft.current = draft;
                      interactionUndoSnapshot.current = createSnapshot();
                      set([selectedItem.width, selectedItem.height]);
                    }}
                    onResize={({ target, width, height, direction }: OnResize) => {
                      if (!selectedId) {
                        return;
                      }

                      const start = resizeStartDraft.current;

                      if (!start || start.id !== selectedId) {
                        return;
                      }

                      const selectedItem = layers.find(
                        (draft) => draft.id === selectedId,
                      );
                      const [horizontal, vertical] = direction;
                      const isCorner = horizontal !== 0 && vertical !== 0;
                      const isVerticalEdge = horizontal === 0 && vertical !== 0;
                      const isHorizontalEdge = horizontal !== 0 && vertical === 0;

                      if (isCorner && selectedItem?.type !== "text") {
                        const nextSize = getAspectLockedSize(start, width, height);
                        const fixedRight = start.x + start.width;
                        const fixedBottom = start.y + start.height;
                        const nextLayout = {
                          width: nextSize.width,
                          height: nextSize.height,
                          x:
                            horizontal < 0
                              ? fixedRight - nextSize.width
                              : start.x,
                          y:
                            vertical < 0
                              ? fixedBottom - nextSize.height
                              : start.y,
                          rotation: start.rotation,
                        };

                        interactionDraft.current = {
                          id: selectedId,
                          ...nextLayout,
                        };
                        applyElementLayout(target, nextLayout);
                        return;
                      }

                      if (isVerticalEdge || (isCorner && selectedItem?.type === "text")) {
                        const nextHeight = clampSize(height);
                        const fixedBottom = start.y + start.height;
                        const nextWidth =
                          isCorner && selectedItem?.type === "text"
                            ? clampSize(width)
                            : start.width;
                        const fixedRight = start.x + start.width;
                        const nextLayout = {
                          x:
                            horizontal < 0 && selectedItem?.type === "text"
                              ? fixedRight - nextWidth
                              : start.x,
                          y: vertical < 0 ? fixedBottom - nextHeight : start.y,
                          width: nextWidth,
                          height: nextHeight,
                          rotation: start.rotation,
                        };

                        interactionDraft.current = {
                          id: selectedId,
                          ...nextLayout,
                        };
                        applyElementLayout(target, nextLayout);
                        return;
                      }

                      if (isHorizontalEdge) {
                        const nextWidth = clampSize(width);
                        const fixedRight = start.x + start.width;
                        const nextLayout = {
                          x: horizontal < 0 ? fixedRight - nextWidth : start.x,
                          y: start.y,
                          width: nextWidth,
                          height: start.height,
                          rotation: start.rotation,
                        };

                        interactionDraft.current = {
                          id: selectedId,
                          ...nextLayout,
                        };
                        applyElementLayout(target, nextLayout);
                      }
                    }}
                    onResizeEnd={() => {
                      commitInteractionDraft();
                      resizeStartDraft.current = null;
                    }}
                    onRotateStart={({ set }: OnRotateStart) => {
                      if (!selectedId) {
                        return;
                      }

                      const selectedItem = layers.find(
                        (draft) => draft.id === selectedId,
                      );

                      if (!selectedItem) {
                        return;
                      }

                      interactionDraft.current = {
                        id: selectedItem.id,
                        x: selectedItem.x,
                        y: selectedItem.y,
                        width: selectedItem.width,
                        height: selectedItem.height,
                        rotation: selectedItem.rotation,
                      };
                      interactionUndoSnapshot.current = createSnapshot();
                      set(selectedItem.rotation);
                    }}
                    onRotate={({ target, beforeRotate }: OnRotate) => {
                      const draft = interactionDraft.current;

                      if (!draft) {
                        return;
                      }

                      const nextLayout = {
                        x: draft.x,
                        y: draft.y,
                        width: draft.width,
                        height: draft.height,
                        rotation: normalizeRotation(beforeRotate),
                      };

                      interactionDraft.current = {
                        id: draft.id,
                        ...nextLayout,
                      };
                      applyElementLayout(target, nextLayout);
                    }}
                    onRotateEnd={commitInteractionDraft}
                  />
                )}

                {selectedLayer && (
                  <button
                    type="button"
                    aria-label="編集バーを開く"
                    onClick={() => {
                      setIsSelectionToolbarOpen((value) => !value);
                    }}
                    className="absolute z-40 flex h-8 w-8 items-center justify-center overflow-hidden rounded-full border border-stone-300 bg-white/95 text-[0] text-transparent shadow-md backdrop-blur transition hover:bg-stone-100"
                    style={selectedToolbarButtonPosition}
                  >
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 24 24"
                      className="h-4 w-4 shrink-0 text-stone-800"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M4 7h16" />
                      <path d="M4 17h16" />
                      <path d="M8 5v4" />
                      <path d="M16 15v4" />
                      <circle cx="8" cy="7" r="2" />
                      <circle cx="16" cy="17" r="2" />
                    </svg>
                    編集
                  </button>
                )}

                {selectedLayer && isSelectionToolbarOpen && (
                  <div
                    className="absolute z-40 w-max max-w-[calc(100%-16px)] -translate-x-1/2 overflow-x-auto rounded-md border border-stone-300 bg-white/95 p-1.5 shadow-xl backdrop-blur"
                    style={selectedToolbarPosition}
                  >
                  <div className="flex items-center gap-1.5 whitespace-nowrap">
                    <span className="hidden">
                      {selectedLayer.type === "text"
                        ? "テキスト"
                        : selectedLayer.assetId
                          ? assetsById.get(selectedLayer.assetId)?.title
                          : selectedLayer.id}
                    </span>
                    <select
                      aria-label="配置"
                      defaultValue=""
                      onChange={(event) => {
                        const direction = event.target.value as
                          | "front"
                          | "forward"
                          | "backward"
                          | "back";
                        reorderSelectedLayer(direction);
                        event.currentTarget.value = "";
                      }}
                      className="order-last h-8 rounded-md border border-stone-300 bg-white px-2 text-xs font-medium outline-none transition hover:bg-stone-100"
                    >
                      <option value="" disabled>
                        配置
                      </option>
                      <option value="front">最前面へ</option>
                      <option value="forward">前面へ</option>
                      <option value="backward">背面へ</option>
                      <option value="back">最背面へ</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => {
                        reorderSelectedLayer("front");
                      }}
                      className="hidden"
                    >
                      最前面
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        reorderSelectedLayer("forward");
                      }}
                      className="hidden"
                    >
                      前面へ
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        reorderSelectedLayer("backward");
                      }}
                      className="hidden"
                    >
                      背面へ
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        reorderSelectedLayer("back");
                      }}
                      className="hidden"
                    >
                      最背面
                    </button>
                    <button
                      type="button"
                      onClick={deleteSelectedLayer}
                      className="hidden"
                    >
                      削除
                    </button>

                    {selectedLayer.type === "text" && (
                      <>
                        <label className="flex items-center rounded-md border border-stone-300 bg-white px-1.5">
                          <span className="sr-only">
                            フォント
                          </span>
                          <select
                            aria-label="フォント"
                            value={selectedLayer.fontFamily ?? "serif"}
                            onChange={(event) => {
                              updateSelectedText({
                                fontFamily: event.target.value,
                              });
                            }}
                            className="h-8 max-w-24 bg-transparent text-xs outline-none"
                          >
                            <option value="serif">Serif</option>
                            <option value="sans-serif">Sans</option>
                            <option value="monospace">Mono</option>
                            <option value="cursive">Script</option>
                          </select>
                        </label>

                        <label className="flex items-center rounded-md border border-stone-300 bg-white px-1.5">
                          <span className="sr-only">
                            サイズ
                          </span>
                          <input
                            aria-label="サイズ"
                            type="number"
                            min={10}
                            max={96}
                            value={selectedLayer.fontSize ?? 20}
                            onChange={(event) => {
                              updateSelectedText({
                                fontSize: Number(event.target.value),
                              });
                            }}
                            className="h-8 w-12 bg-transparent text-xs outline-none"
                          />
                        </label>

                        <label className="flex h-8 items-center rounded-md border border-stone-300 bg-white px-1.5">
                          <span className="sr-only">
                            色
                          </span>
                          <input
                            aria-label="色"
                            type="color"
                            value={selectedLayer.color ?? "#2b241f"}
                            onChange={(event) => {
                              updateSelectedText({ color: event.target.value });
                            }}
                            className="h-6 w-7 bg-transparent"
                          />
                        </label>

                        <div className="flex items-center rounded-md border border-stone-300 bg-white p-1">
                          <button
                            type="button"
                            onClick={() => {
                              updateSelectedText({
                                fontWeight:
                                  selectedLayer.fontWeight === "700"
                                    ? "500"
                                    : "700",
                              });
                            }}
                            className={`h-6 w-6 rounded text-xs font-bold transition ${
                              selectedLayer.fontWeight === "700"
                                ? "bg-emerald-700 text-white"
                                : "hover:bg-stone-100"
                            }`}
                            aria-label="太字"
                          >
                            B
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              updateSelectedText({
                                fontStyle:
                                  selectedLayer.fontStyle === "italic"
                                    ? "normal"
                                    : "italic",
                              });
                            }}
                            className={`h-6 w-6 rounded text-xs italic transition ${
                              selectedLayer.fontStyle === "italic"
                                ? "bg-emerald-700 text-white"
                                : "hover:bg-stone-100"
                            }`}
                            aria-label="斜体"
                          >
                            I
                          </button>
                        </div>

                        <div className="flex items-center rounded-md border border-stone-300 bg-white p-1">
                          {(["left", "center", "right"] as const).map((align) => (
                            <button
                              key={align}
                              type="button"
                              onClick={() => {
                                updateSelectedText({ textAlign: align });
                              }}
                              className={`h-6 min-w-7 rounded px-1.5 text-[11px] font-semibold transition ${
                                (selectedLayer.textAlign ?? "center") === align
                                  ? "bg-emerald-700 text-white"
                                  : "hover:bg-stone-100"
                              }`}
                            >
                              {align === "left"
                                ? "左"
                                : align === "center"
                                  ? "中央"
                                  : "右"}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}
              </div>
            </div>

            {selectedLayer && (
              <div className="hidden">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-medium text-stone-500">
                      選択中のレイヤー
                    </p>
                    <p className="mt-1 text-sm font-semibold text-stone-900">
                      {selectedLayer.type === "text"
                        ? "テキスト"
                        : selectedLayer.assetId
                          ? assetsById.get(selectedLayer.assetId)?.title
                          : selectedLayer.id}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        reorderSelectedLayer("front");
                      }}
                      className="rounded-md border border-stone-300 bg-white px-3 py-2 text-sm font-medium transition hover:bg-stone-100"
                    >
                      最前面
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        reorderSelectedLayer("forward");
                      }}
                      className="rounded-md border border-stone-300 bg-white px-3 py-2 text-sm font-medium transition hover:bg-stone-100"
                    >
                      前面へ
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        reorderSelectedLayer("backward");
                      }}
                      className="rounded-md border border-stone-300 bg-white px-3 py-2 text-sm font-medium transition hover:bg-stone-100"
                    >
                      背面へ
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        reorderSelectedLayer("back");
                      }}
                      className="rounded-md border border-stone-300 bg-white px-3 py-2 text-sm font-medium transition hover:bg-stone-100"
                    >
                      最背面
                    </button>
                    <button
                      type="button"
                      onClick={deleteSelectedLayer}
                      className="rounded-md border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-700 transition hover:bg-red-50"
                    >
                      削除
                    </button>
                  </div>
                </div>

                {selectedLayer.type === "text" && (
                  <div className="mt-4 flex flex-wrap items-end gap-3 border-t border-stone-200 pt-4">
                    <label className="block w-40">
                      <span className="text-xs font-medium text-stone-500">
                        フォント
                      </span>
                      <select
                        value={selectedLayer.fontFamily ?? "serif"}
                        onChange={(event) => {
                          updateSelectedText({
                            fontFamily: event.target.value,
                          });
                        }}
                        className="mt-1 w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-700"
                      >
                        <option value="serif">Serif</option>
                        <option value="sans-serif">Sans</option>
                        <option value="monospace">Mono</option>
                        <option value="cursive">Script</option>
                      </select>
                    </label>

                    <label className="block w-24">
                      <span className="text-xs font-medium text-stone-500">
                        サイズ
                      </span>
                      <input
                        type="number"
                        min={10}
                        max={96}
                        value={selectedLayer.fontSize ?? 20}
                        onChange={(event) => {
                          updateSelectedText({
                            fontSize: Number(event.target.value),
                          });
                        }}
                        className="mt-1 w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-700"
                      />
                    </label>

                    <label className="block w-20">
                      <span className="text-xs font-medium text-stone-500">
                        色
                      </span>
                      <input
                        type="color"
                        value={selectedLayer.color ?? "#2b241f"}
                        onChange={(event) => {
                          updateSelectedText({ color: event.target.value });
                        }}
                        className="mt-1 h-10 w-full rounded-md border border-stone-300 bg-white px-2 py-1"
                      />
                    </label>

                    <div className="flex items-center rounded-md border border-stone-300 bg-white p-1">
                      <button
                        type="button"
                        onClick={() => {
                          updateSelectedText({
                            fontWeight:
                              selectedLayer.fontWeight === "700" ? "500" : "700",
                          });
                        }}
                        className={`h-8 w-8 rounded text-sm font-bold transition ${
                          selectedLayer.fontWeight === "700"
                            ? "bg-emerald-700 text-white"
                            : "hover:bg-stone-100"
                        }`}
                        aria-label="太字"
                      >
                        B
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          updateSelectedText({
                            fontStyle:
                              selectedLayer.fontStyle === "italic"
                                ? "normal"
                                : "italic",
                          });
                        }}
                        className={`h-8 w-8 rounded text-sm italic transition ${
                          selectedLayer.fontStyle === "italic"
                            ? "bg-emerald-700 text-white"
                            : "hover:bg-stone-100"
                        }`}
                        aria-label="斜体"
                      >
                        I
                      </button>
                    </div>

                    <div className="flex items-center rounded-md border border-stone-300 bg-white p-1">
                      {(["left", "center", "right"] as const).map((align) => (
                        <button
                          key={align}
                          type="button"
                          onClick={() => {
                            updateSelectedText({ textAlign: align });
                          }}
                          className={`h-8 min-w-10 rounded px-2 text-xs font-semibold transition ${
                            (selectedLayer.textAlign ?? "center") === align
                              ? "bg-emerald-700 text-white"
                              : "hover:bg-stone-100"
                          }`}
                        >
                          {align === "left"
                            ? "左"
                            : align === "center"
                              ? "中央"
                              : "右"}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>
        </div>
      </div>

      {pendingBase && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/45 px-5 py-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="base-change-dialog-title"
        >
          <div className="w-full max-w-md rounded-lg border border-stone-200 bg-white p-5 shadow-xl">
            <div className="mb-4">
              <h3
                id="base-change-dialog-title"
                className="text-lg font-semibold"
              >
                ベース素材を変更しますか
              </h3>
              <p className="mt-1 text-sm text-stone-500">
                配置済みのテキスト、画像、スタンプはそのまま残ります。
              </p>
            </div>

            <div className="overflow-hidden rounded-md border border-stone-200 bg-stone-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={pendingBase.imageSrc}
                alt=""
                className="h-64 w-full object-contain"
                draggable={false}
              />
            </div>

            <p className="mt-3 text-sm font-semibold">{pendingBase.title}</p>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={cancelBaseChange}
                className="rounded-md border border-stone-300 bg-white px-4 py-2 text-sm font-medium transition hover:bg-stone-100"
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={confirmBaseChange}
                className="rounded-md bg-emerald-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-800"
              >
                変更する
              </button>
            </div>
          </div>
        </div>
      )}

      {previewAsset && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/45 px-5 py-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="asset-preview-title"
        >
          <div className="w-full max-w-md rounded-lg border border-stone-200 bg-white p-4 shadow-xl">
            <div className="mb-4 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => {
                  setPreviewAssetId(null);
                }}
                className="rounded-md border border-stone-300 bg-white px-3 py-2 text-sm font-medium transition hover:bg-stone-100"
              >
                戻る
              </button>
              <span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-medium text-stone-600">
                {assetTypeLabels[previewAsset.type]}
              </span>
            </div>

            {previewAsset.mediaSrc ? (
              <div className="mb-4 h-64 overflow-hidden rounded-md bg-stone-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={previewAsset.mediaSrc}
                  alt={previewAsset.title}
                  className={`h-full w-full ${
                    previewAsset.type === "stamp"
                      ? "object-contain p-4"
                      : "object-cover"
                  }`}
                  draggable={false}
                />
              </div>
            ) : (
              <div
                className={`mb-4 flex h-56 items-center justify-center rounded-md px-6 text-lg font-bold text-stone-950 ${previewAsset.accent}`}
              >
                {previewAsset.label}
              </div>
            )}

            <h3 id="asset-preview-title" className="text-lg font-semibold">
              {previewAsset.title}
            </h3>
            <button
              type="button"
              onClick={() => {
                addAssetLayer(previewAsset);
                setPreviewAssetId(null);
              }}
              className="mt-5 w-full rounded-md bg-emerald-700 px-4 py-3 text-sm font-medium text-white transition hover:bg-emerald-800"
            >
              キャンバスに追加
            </button>
          </div>
        </div>
      )}

      {isSaveDialogOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/45 px-5 py-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="save-dialog-title"
        >
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void saveEphemera("png");
            }}
            className="w-full max-w-md rounded-lg border border-stone-200 bg-white p-5 shadow-xl"
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h3 id="save-dialog-title" className="text-lg font-semibold">
                  エフェメラに名前を付ける
                </h3>
                <p className="mt-1 text-sm text-stone-500">
                  一覧で見分けやすい名前を入力してください。
                </p>
              </div>
              <button
                type="button"
                onClick={closeSaveDialog}
                className="rounded-md border border-stone-300 bg-white px-3 py-2 text-sm font-medium transition hover:bg-stone-100"
              >
                閉じる
              </button>
            </div>

            <label className="block">
              <span className="text-xs font-medium text-stone-500">名前</span>
              <input
                ref={saveNameInputRef}
                value={ephemeraName}
                onChange={(event) => {
                  setEphemeraName(event.target.value);
                  setExportError(null);
                }}
                placeholder="例: 京都の朝の記録"
                className="mt-1 w-full rounded-md border border-stone-300 bg-white px-3 py-3 text-sm outline-none focus:border-emerald-700"
              />
            </label>

            {exportError && (
              <p className="mt-3 text-sm font-medium text-red-700">
                {exportError}
              </p>
            )}

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeSaveDialog}
                disabled={isExporting}
                className="rounded-md border border-stone-300 bg-white px-4 py-2 text-sm font-medium transition hover:bg-stone-100"
              >
                キャンセル
              </button>
              <button
                type="submit"
                disabled={!ephemeraName.trim() || isExporting}
                className="rounded-md bg-emerald-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {exportingFormat === "png" ? "PNG保存中" : "PNGで保存"}
              </button>
              <button
                type="button"
                onClick={() => {
                  void saveEphemera("pdf");
                }}
                disabled={!ephemeraName.trim() || isExporting}
                className="rounded-md bg-stone-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {exportingFormat === "pdf" ? "PDF保存中" : "PDFで保存"}
              </button>
            </div>
          </form>
        </div>
      )}
    </main>
  );
}

"use client";

import Link from "next/link";
import Moveable from "react-moveable";
import { useEffect, useMemo, useRef, useState } from "react";
import type {
  OnDrag,
  OnDragStart,
  OnResize,
  OnResizeStart,
  OnRotate,
  OnRotateStart,
} from "react-moveable";

type AssetType = "ephemera" | "photo" | "video" | "audio" | "stamp";

type ScrapbookAsset = {
  id: string;
  type: AssetType;
  title: string;
  description: string;
  accent: string;
  mediaSrc?: string;
  defaultSize: {
    width: number;
    height: number;
  };
};

type PlacedAsset = {
  id: string;
  assetId: string;
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

type ScrapbookSnapshot = {
  placedAssets: PlacedAsset[];
  selectedId: string | null;
  nextZIndex: number;
  nextPlacedId: number;
};

const mockAssets: ScrapbookAsset[] = [
  {
    id: "sample-image",
    type: "photo",
    title: "サンプル画像",
    description: "image_sample.jpg",
    accent: "bg-[#9fb6c9]",
    mediaSrc: "/image_sample.jpg",
    defaultSize: { width: 240, height: 180 },
  },
  {
    id: "ticket-kyoto",
    type: "ephemera",
    title: "京都の朝の切符",
    description: "日付と場所が残った紙片",
    accent: "bg-[#d9c8a9]",
    defaultSize: { width: 190, height: 128 },
  },
  {
    id: "photo-rain",
    type: "photo",
    title: "雨の日の写真",
    description: "路地の光を写した一枚",
    accent: "bg-[#9fb6c9]",
    mediaSrc: "/image_sample.jpg",
    defaultSize: { width: 220, height: 160 },
  },
  {
    id: "video-station",
    type: "video",
    title: "駅前の短い動画",
    description: "10秒の記録映像",
    accent: "bg-[#bea7d8]",
    defaultSize: { width: 196, height: 116 },
  },
  {
    id: "audio-voice",
    type: "audio",
    title: "街角の音声メモ",
    description: "会話と環境音",
    accent: "bg-[#a7c7b5]",
    defaultSize: { width: 210, height: 96 },
  },
  {
    id: "stamp-star",
    type: "stamp",
    title: "星のスタンプ",
    description: "強調用の小さな印",
    accent: "bg-[#f0c56d]",
    defaultSize: { width: 96, height: 96 },
  },
];

async function fetchScrapbookAssets() {
  return mockAssets;
}

const assetTypeLabels: Record<AssetType, string> = {
  ephemera: "エフェメラ",
  photo: "画像",
  video: "動画",
  audio: "音声",
  stamp: "スタンプ",
};

const assetTypeOrder: AssetType[] = [
  "ephemera",
  "photo",
  "video",
  "audio",
  "stamp",
];

function clampSize(value: number) {
  return Math.max(48, Math.round(value));
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

  if (nextWidth < 48) {
    nextWidth = 48;
    nextHeight = Math.round(nextWidth / ratio);
  }

  if (nextHeight < 48) {
    nextHeight = 48;
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

export default function ScrapbookPage() {
  const [assets, setAssets] = useState<ScrapbookAsset[]>(mockAssets);
  const [placedAssets, setPlacedAssets] = useState<PlacedAsset[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedTarget, setSelectedTarget] = useState<HTMLDivElement | null>(
    null,
  );
  const [expandedAssetTypes, setExpandedAssetTypes] = useState<AssetType[]>([]);
  const [previewAssetId, setPreviewAssetId] = useState<string | null>(null);
  const [nextZIndex, setNextZIndex] = useState(1);
  const [canUndo, setCanUndo] = useState(false);
  const assetRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const moveableRef = useRef<MoveableHandle | null>(null);
  const nextPlacedId = useRef(1);
  const resizeStartDraft = useRef<InteractionDraft | null>(null);
  const interactionDraft = useRef<InteractionDraft | null>(null);
  const interactionUndoSnapshot = useRef<ScrapbookSnapshot | null>(null);
  const undoStack = useRef<ScrapbookSnapshot[]>([]);

  useEffect(() => {
    let active = true;

    fetchScrapbookAssets().then((items) => {
      if (active) {
        setAssets(items);
      }
    });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    setSelectedTarget(selectedId ? assetRefs.current[selectedId] ?? null : null);
  }, [selectedId, placedAssets.length]);

  const assetsById = useMemo(
    () => new Map(assets.map((asset) => [asset.id, asset])),
    [assets],
  );

  const assetsByType = useMemo(
    () =>
      assetTypeOrder.reduce<Record<AssetType, ScrapbookAsset[]>>(
        (groupedAssets, type) => {
          groupedAssets[type] = assets.filter((asset) => asset.type === type);
          return groupedAssets;
        },
        {
          ephemera: [],
          photo: [],
          video: [],
          audio: [],
          stamp: [],
        },
      ),
    [assets],
  );

  const previewAsset = previewAssetId
    ? assetsById.get(previewAssetId) ?? null
    : null;

  function clonePlacedAssets(items: PlacedAsset[]) {
    return items.map((item) => ({ ...item }));
  }

  function createSnapshot(
    currentPlacedAssets = placedAssets,
  ): ScrapbookSnapshot {
    return {
      placedAssets: clonePlacedAssets(currentPlacedAssets),
      selectedId,
      nextZIndex,
      nextPlacedId: nextPlacedId.current,
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
    setPlacedAssets(clonePlacedAssets(snapshot.placedAssets));
    setSelectedId(snapshot.selectedId);
    setSelectedTarget(
      snapshot.selectedId ? assetRefs.current[snapshot.selectedId] ?? null : null,
    );
    setNextZIndex(snapshot.nextZIndex);
    nextPlacedId.current = snapshot.nextPlacedId;
    resizeStartDraft.current = null;
    interactionDraft.current = null;
    interactionUndoSnapshot.current = null;
    setCanUndo(undoStack.current.length > 0);

    requestAnimationFrame(() => {
      moveableRef.current?.updateRect();
    });
  }

  function updatePlacedAsset(
    id: string,
    changes: Partial<Omit<PlacedAsset, "id" | "assetId">>,
  ) {
    setPlacedAssets((current) =>
      current.map((item) =>
        item.id === id ? { ...item, ...changes } : item,
      ),
    );
  }

  function commitInteractionDraft() {
    const draft = interactionDraft.current;

    if (!draft) {
      return;
    }

    const currentItem = placedAssets.find((item) => item.id === draft.id);
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

    updatePlacedAsset(draft.id, {
      x: draft.x,
      y: draft.y,
      width: draft.width,
      height: draft.height,
      rotation: normalizeRotation(draft.rotation),
    });
    interactionDraft.current = null;
    interactionUndoSnapshot.current = null;
  }

  function selectPlacedAsset(id: string) {
    setSelectedId(id);
    setSelectedTarget(assetRefs.current[id] ?? null);
  }

  function addAssetToBoard(asset: ScrapbookAsset) {
    pushUndoSnapshot();

    const id = `${asset.id}-${nextPlacedId.current}`;
    const zIndex = nextZIndex;
    nextPlacedId.current += 1;

    setPlacedAssets((current) => {
      const count = current.length;
      const newItem: PlacedAsset = {
        id,
        assetId: asset.id,
        x: 56 + (count % 4) * 28,
        y: 48 + (count % 5) * 24,
        width: asset.defaultSize.width,
        height: asset.defaultSize.height,
        rotation: asset.type === "stamp" ? 352 : 0,
        zIndex,
      };

      return [...current, newItem];
    });
    setSelectedId(id);
    setNextZIndex((value) => value + 1);
  }

  function deleteSelectedAsset() {
    if (!selectedId) {
      return;
    }

    pushUndoSnapshot();

    delete assetRefs.current[selectedId];
    setPlacedAssets((current) =>
      current.filter((item) => item.id !== selectedId),
    );
    setSelectedId(null);
    setSelectedTarget(null);
    resizeStartDraft.current = null;
    interactionDraft.current = null;
  }

  function reorderSelectedAsset(
    direction: "front" | "forward" | "backward" | "back",
  ) {
    if (!selectedId) {
      return;
    }

    const sortedAssets = [...placedAssets].sort(
      (first, second) => first.zIndex - second.zIndex,
    );
    const currentIndex = sortedAssets.findIndex(
      (item) => item.id === selectedId,
    );

    if (currentIndex === -1) {
      return;
    }

    const nextOrder = [...sortedAssets];
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
    setPlacedAssets(
      nextOrder.map((item, index) => ({
        ...item,
        zIndex: index + 1,
      })),
    );
    setNextZIndex(nextOrder.length + 1);
  }

  function moveSelectedAsset(deltaX: number, deltaY: number) {
    if (!selectedId) {
      return;
    }

    pushUndoSnapshot();

    setPlacedAssets((current) =>
      current.map((item) => {
        if (item.id !== selectedId) {
          return item;
        }

        const nextItem = {
          ...item,
          x: item.x + deltaX,
          y: item.y + deltaY,
        };

        applyElementLayout(assetRefs.current[item.id], nextItem);
        requestAnimationFrame(() => {
          moveableRef.current?.updateRect();
        });

        return nextItem;
      }),
    );
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
        deleteSelectedAsset();
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
      moveSelectedAsset(movement[0], movement[1]);
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  });

  return (
    <main className="min-h-screen bg-[#f7f4ef] px-5 py-6 text-stone-950 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 flex items-center justify-between border-b border-stone-300 pb-4">
          <div>
            <p className="text-sm font-medium text-emerald-700">Create</p>
            <h1 className="text-3xl font-semibold tracking-normal">
              スクラップブック作成
            </h1>
          </div>
          <Link
            href="/"
            className="rounded-md border border-stone-300 bg-white px-4 py-2 text-sm font-medium transition hover:bg-stone-100"
          >
            ホーム
          </Link>
        </header>

        <div className="grid gap-5 lg:grid-cols-[300px_1fr]">
          <aside className="rounded-lg border border-stone-300 bg-white p-5 shadow-sm">
            <div className="flex items-end justify-between">
              <div>
                <h2 className="text-lg font-semibold">素材一覧</h2>
                <p className="mt-1 text-xs text-stone-500">
                  サムネイルを選んで詳細から追加
                </p>
              </div>
              <span className="text-xs font-medium text-stone-500">
                {assets.length}件
              </span>
            </div>

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
                          className={`h-3 w-3 shrink-0 rounded-full ${mockAssets.find((asset) => asset.type === type)?.accent ?? "bg-stone-300"}`}
                        />
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-semibold">
                            {assetTypeLabels[type]}
                          </span>
                          <span className="mt-0.5 block text-xs text-stone-500">
                            {categoryAssets.length}件
                          </span>
                        </span>
                      </span>
                      <span
                        className={`text-sm text-stone-500 transition ${
                          isExpanded ? "rotate-90" : ""
                        }`}
                      >
                        ›
                      </span>
                    </button>

                    {isExpanded && (
                      <div className="space-y-2 border-t border-stone-200 bg-stone-50 p-2">
                        {categoryAssets.length === 0 ? (
                          <p className="px-2 py-3 text-xs text-stone-500">
                            このカテゴリの素材はまだありません
                          </p>
                        ) : (
                          <div className="grid grid-cols-6 gap-1">
                            {categoryAssets.map((asset) => {
                              const isPreviewed = previewAssetId === asset.id;

                              return (
                                <button
                                  key={asset.id}
                                  type="button"
                                  onClick={() => {
                                    setPreviewAssetId(asset.id);
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
                                      className="h-full w-full object-cover"
                                      draggable={false}
                                    />
                                  ) : (
                                    <span
                                      className={`flex h-full w-full items-center justify-center px-1 text-center text-[9px] font-bold leading-3 text-stone-950 ${asset.accent}`}
                                    >
                                      {assetTypeLabels[asset.type]}
                                    </span>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </aside>

          <section className="rounded-lg border border-stone-300 bg-white p-5 shadow-sm">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">台紙</h2>
                <p className="mt-1 text-xs font-medium text-emerald-700">
                  配置済み: {placedAssets.length}件
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={undoLastAction}
                  disabled={!canUndo}
                  className="rounded-md border border-stone-300 bg-white px-4 py-2 text-sm font-medium transition hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  戻る
                </button>
                <button
                  type="button"
                  className="rounded-md bg-emerald-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-800"
                >
                  保存
                </button>
              </div>
            </div>

            <div
              className="relative min-h-[560px] overflow-hidden rounded-md border border-dashed border-stone-300 bg-[#fbfaf7]"
              onMouseDown={(event) => {
                if (event.currentTarget === event.target) {
                  setSelectedId(null);
                  setSelectedTarget(null);
                }
              }}
            >
              {placedAssets.length === 0 && (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-stone-400">
                  素材を選んで追加ボタンから台紙に配置
                </div>
              )}

              {placedAssets.map((item) => {
                const asset = assetsById.get(item.assetId);

                if (!asset) {
                  return null;
                }

                const isSelected = selectedId === item.id;

                return (
                  <div
                    key={item.id}
                    ref={(element) => {
                      assetRefs.current[item.id] = element;
                    }}
                    role="button"
                    tabIndex={0}
                    onClick={(event) => {
                      event.stopPropagation();
                      selectPlacedAsset(item.id);
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        selectPlacedAsset(item.id);
                      }
                    }}
                    className={`absolute cursor-move select-none rounded-md border bg-white shadow-sm outline-none ${
                      isSelected
                        ? "border-emerald-700 ring-2 ring-emerald-600 ring-offset-2"
                        : "border-stone-300"
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
                    {isSelected && (
                      <button
                        type="button"
                        aria-label="素材を削除"
                        onClick={(event) => {
                          event.stopPropagation();
                          deleteSelectedAsset();
                        }}
                        className="hidden"
                      >
                        ×
                      </button>
                    )}
                    <div
                      className={`relative flex h-full w-full flex-col justify-between overflow-hidden rounded-[inherit] p-4 ${asset.accent}`}
                    >
                      {asset.mediaSrc ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={asset.mediaSrc}
                          alt={asset.title}
                          className="absolute inset-0 h-full w-full object-cover"
                          draggable={false}
                        />
                      ) : (
                        <>
                          <div>
                            <p className="text-xs font-bold uppercase text-stone-700">
                              {assetTypeLabels[asset.type]}
                            </p>
                            <h3 className="mt-2 text-sm font-semibold leading-5">
                              {asset.title}
                            </h3>
                            <p className="mt-2 text-xs leading-5 text-stone-700">
                              {asset.description}
                            </p>
                          </div>
                          {asset.type === "audio" && (
                            <div className="mt-3 h-2 rounded-full bg-white/70">
                              <div className="h-2 w-1/2 rounded-full bg-stone-950" />
                            </div>
                          )}
                          {asset.type === "video" && (
                            <div className="mt-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/80 text-xs font-bold">
                              PLAY
                            </div>
                          )}
                        </>
                      )}
                      {asset.mediaSrc && (
                        <div className="absolute inset-x-0 bottom-0 bg-white/85 px-3 py-2">
                          <p className="truncate text-xs font-semibold">
                            {asset.title}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {selectedTarget && (
                <Moveable
                  ref={(instance) => {
                    moveableRef.current = instance;
                  }}
                  target={selectedTarget}
                  draggable
                  resizable
                  rotatable
                  keepRatio={false}
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
                    if (!selectedId) {
                      return;
                    }

                    const selectedItem = placedAssets.find(
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

                    const selectedItem = placedAssets.find(
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

                    const [horizontal, vertical] = direction;
                    const isCorner = horizontal !== 0 && vertical !== 0;
                    const isVerticalEdge = horizontal === 0 && vertical !== 0;
                    const isHorizontalEdge = horizontal !== 0 && vertical === 0;

                    if (isCorner) {
                      const nextSize = getAspectLockedSize(
                        start,
                        width,
                        height,
                      );
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

                    if (isVerticalEdge) {
                      const nextHeight = clampSize(height);
                      const fixedBottom = start.y + start.height;
                      const nextLayout = {
                        x: start.x,
                        y: vertical < 0 ? fixedBottom - nextHeight : start.y,
                        width: start.width,
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

                    const selectedItem = placedAssets.find(
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
            </div>

            {selectedId && (
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-md border border-stone-200 bg-stone-50 px-4 py-3">
                <div>
                  <p className="text-xs font-medium text-stone-500">
                    選択中の素材
                  </p>
                  <p className="mt-1 text-sm font-semibold text-stone-900">
                    {selectedId}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      reorderSelectedAsset("front");
                    }}
                    className="rounded-md border border-stone-300 bg-white px-3 py-2 text-sm font-medium transition hover:bg-stone-100"
                  >
                    最前面へ
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      reorderSelectedAsset("forward");
                    }}
                    className="rounded-md border border-stone-300 bg-white px-3 py-2 text-sm font-medium transition hover:bg-stone-100"
                  >
                    前面へ
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      reorderSelectedAsset("backward");
                    }}
                    className="rounded-md border border-stone-300 bg-white px-3 py-2 text-sm font-medium transition hover:bg-stone-100"
                  >
                    背面へ
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      reorderSelectedAsset("back");
                    }}
                    className="rounded-md border border-stone-300 bg-white px-3 py-2 text-sm font-medium transition hover:bg-stone-100"
                  >
                    最背面へ
                  </button>
                  <button
                    type="button"
                    onClick={deleteSelectedAsset}
                    className="ml-0 rounded-md border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-700 transition hover:bg-red-50 sm:ml-4"
                  >
                    削除
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>

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
                  className="h-full w-full object-cover"
                  draggable={false}
                />
              </div>
            ) : (
              <div
                className={`mb-4 flex h-56 items-center justify-center rounded-md px-6 text-lg font-bold text-stone-950 ${previewAsset.accent}`}
              >
                {assetTypeLabels[previewAsset.type]}
              </div>
            )}

            <h3 id="asset-preview-title" className="text-lg font-semibold">
              {previewAsset.title}
            </h3>
            <p className="mt-2 text-sm leading-6 text-stone-600">
              {previewAsset.description}
            </p>
            <button
              type="button"
              onClick={() => {
                addAssetToBoard(previewAsset);
                setPreviewAssetId(null);
              }}
              className="mt-5 w-full rounded-md bg-emerald-700 px-4 py-3 text-sm font-medium text-white transition hover:bg-emerald-800"
            >
              台紙に追加
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

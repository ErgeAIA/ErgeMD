import ContextMenu from "@/components/context-menu/ContextMenu";
import { getImageContextMenuItems } from "@/components/context-menu/ImageContextMenu";
import Portal from "@/components/Portal";
import { useContextMenu } from "@/hooks/useContextMenu";
import { useQuickEdit } from "@/hooks/useQuickEdit";
import { useFileStore } from "@/stores/fileStore";
import { useReaderStore } from "@/stores/readerStore";
import { invoke } from "@tauri-apps/api/core";
import React, { memo, useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import ImageEditModal from "./ImageEditModal";

type ContextMenuImageProps = React.ImgHTMLAttributes<HTMLImageElement>;

const DEFAULT_PLACEHOLDER_HEIGHT = 200;

const ContextMenuImage: React.FC<ContextMenuImageProps> = memo((props) => {
  const { t } = useTranslation();
  const { src, alt, ...rest } = props;
  const setPreviewImage = useReaderStore((s) => s.setPreviewImage);
  const currentFilePath = useFileStore((s) => s.currentFilePath);
  const [resolvedSrc, setResolvedSrc] = useState(src ?? "");
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [currentSrc, setCurrentSrc] = useState("");
  const [currentAlt, setCurrentAlt] = useState("");
  const {
    menuState,
    menuRef,
    show: showContextMenu,
    hide: hideContextMenu,
    adjustPosition,
  } = useContextMenu();
  const { startEdit } = useQuickEdit();
  const wrapperRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!src || src.startsWith("http") || src.startsWith("data:")) {
      setResolvedSrc(src ?? "");
      setIsLoading(false);
      setLoadError(false);
      return;
    }

    setIsLoading(true);
    setLoadError(false);

    const loadLocalImage = async () => {
      try {
        const dataUrl = await invoke<string>("read_image_as_data_url", {
          basePath: currentFilePath,
          relativePath: src,
        });
        setResolvedSrc(dataUrl);
        setIsLoading(false);
      } catch (err) {
        console.error("Failed to load local image:", err);
        setResolvedSrc(src ?? "");
        setLoadError(true);
        setIsLoading(false);
      }
    };

    loadLocalImage();
  }, [src, currentFilePath]);

  const handleLoad = () => {
    setIsLoading(false);
  };

  const handleError = () => {
    setIsLoading(false);
    setLoadError(true);
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // 检测图片是否在链接中，以及是否能找到包含 data-raw 的父元素
    const isInsideLink = wrapperRef.current?.closest('a') !== null;
    const hasRawParent = wrapperRef.current?.closest('[data-raw]') !== null;
    
    const items = getImageContextMenuItems(
      {
        imageUrl: resolvedSrc,
        imageAlt: alt || "",
        onCopyImage: () => {
          const img = new Image();
          img.crossOrigin = "anonymous";
          img.onload = () => {
            const canvas = document.createElement("canvas");
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext("2d");
            ctx?.drawImage(img, 0, 0);
            canvas.toBlob((blob) => {
              if (blob) {
                navigator.clipboard.write([
                  new ClipboardItem({ "image/png": blob }),
                ]);
              }
            });
          };
          img.src = resolvedSrc;
        },
        onViewFullSize: () => {
          setPreviewImage(resolvedSrc);
        },
        onOpenInNewWindow: () => {
          window.open(resolvedSrc, "_blank");
        },
        onCopyImagePath: () => {
          navigator.clipboard.writeText(resolvedSrc);
        },
        onEditImage: () => {
          hideContextMenu();
          setCurrentSrc(resolvedSrc);
          setCurrentAlt(alt || "");
          setShowEditModal(true);
        },
      },
      t,
    );
    
    // 如果在链接中且有 data-raw 父元素，添加编辑整段源码选项
    if (isInsideLink && hasRawParent) {
      items.push({ id: "sep3", separator: true });
      items.push({
        id: "editBlockSource",
        label: "编辑整段源码",
        action: () => {
          hideContextMenu();
          if (wrapperRef.current) {
            startEdit(wrapperRef.current);
          }
        }
      });
    }
    
    showContextMenu(e, items);
  };

  const handleSaveImage = useCallback((newSrc: string, newAlt: string) => {
    setShowEditModal(false);
    setCurrentSrc(newSrc);
    setCurrentAlt(newAlt);
    setResolvedSrc(newSrc);
  }, []);

  const handleCancelEdit = useCallback(() => {
    setShowEditModal(false);
  }, []);

  return (
    <>
      <span
        ref={wrapperRef}
        className="relative my-4"
        style={{
          display: "inline-block",
          minHeight: `${DEFAULT_PLACEHOLDER_HEIGHT}px`,
          borderRadius: "6px",
          overflow: "hidden",
        }}
        onContextMenu={handleContextMenu}
      >
        {isLoading && !loadError && (
          <span
            className="absolute inset-0"
            style={{
              display: "block",
              background:
                "linear-gradient(90deg, var(--bg-code) 25%, var(--bg-secondary) 50%, var(--bg-code) 75%)",
              backgroundSize: "200% 100%",
              animation: "skeleton-loading 1.5s ease-in-out infinite",
            }}
          />
        )}
        {loadError ? (
          <span
            className="flex items-center justify-center"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              minHeight: `${DEFAULT_PLACEHOLDER_HEIGHT}px`,
              background: "var(--bg-code)",
              color: "var(--text-muted)",
              fontSize: "13px",
            }}
          >
            {t("image.loadFailed")}
          </span>
        ) : (
          <img
            src={resolvedSrc}
            alt={alt || ""}
            loading="lazy"
            decoding="async"
            onLoad={handleLoad}
            onError={handleError}
            onClick={() => setPreviewImage(resolvedSrc)}
            className="cursor-pointer"
            style={{
              maxWidth: "100%",
              height: "auto",
              borderRadius: "6px",
              margin: 0,
              opacity: isLoading ? 0 : 1,
              transition: "opacity 0.2s ease-in",
            }}
            {...rest}
          />
        )}
      </span>
      <Portal>
        {menuState && menuState.visible && (
          <ContextMenu
            menuState={menuState}
            menuRef={menuRef}
            adjustPosition={adjustPosition}
            onClose={hideContextMenu}
          />
        )}
        {showEditModal && (
          <ImageEditModal
            imageSrc={currentSrc}
            imageAlt={currentAlt}
            onSave={handleSaveImage}
            onCancel={handleCancelEdit}
          />
        )}
      </Portal>
    </>
  );
});

ContextMenuImage.displayName = "ContextMenuImage";

export default ContextMenuImage;

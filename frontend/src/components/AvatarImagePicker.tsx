import {
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  type WheelEvent as ReactWheelEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import { AvatarDialogBody } from "./AvatarCropDialog";
import { Button, Modal } from "./ui";

const avatarCropStageSize = 280;
const avatarCropSize = 210;

type AvatarImagePickerProps = {
  assetId: string;
  label: string;
  name: string;
  onChange: (next: { assetId: string; url: string }) => void;
  uploadImage: (file: Blob, filename?: string) => Promise<{ assetId: string; url: string }>;
  url: string;
};

export function avatarImageSrc(assetId?: string, url?: string) {
  if (assetId) return `/api/assets/${assetId}`;
  return url || "";
}

export function AvatarImagePicker({
  assetId,
  label,
  name,
  onChange,
  uploadImage,
  url,
}: AvatarImagePickerProps) {
  const [open, setOpen] = useState(false);
  const [imageURL, setImageURL] = useState(url);
  const [filePreviewURL, setFilePreviewURL] = useState("");
  const [sourceFilename, setSourceFilename] = useState("avatar.png");
  const [uploading, setUploading] = useState(false);
  const [fileError, setFileError] = useState("");
  const [previewError, setPreviewError] = useState("");
  const [naturalSize, setNaturalSize] = useState({ width: 0, height: 0 });
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [rotation, setRotation] = useState(0);
  const [flipX, setFlipX] = useState(false);
  const [flipY, setFlipY] = useState(false);
  const [cropEdited, setCropEdited] = useState(false);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const dragRef = useRef<{
    pointerId: number;
    x: number;
    y: number;
    pan: { x: number; y: number };
  } | null>(null);
  const src = avatarImageSrc(assetId, url);
  const urlValidationError = imageURL.trim() ? validateAvatarURL(imageURL.trim()) : "";
  const activeURL = imageURL.trim();
  const proxiedURLSrc =
    activeURL && !urlValidationError
      ? `/api/assets/image-proxy?url=${encodeURIComponent(activeURL)}`
      : "";
  const sourceSrc = filePreviewURL || proxiedURLSrc || src;
  const sourceKind = filePreviewURL
    ? "file"
    : activeURL && !urlValidationError
      ? "url"
      : src
        ? "existing"
        : "none";
  const cropActive = sourceKind === "file" || cropEdited;
  const canSave = Boolean(
    sourceSrc &&
    sourceKind !== "none" &&
    !urlValidationError &&
    (filePreviewURL || activeURL || cropEdited),
  );
  const orientedWidth = rotation % 180 === 0 ? naturalSize.width : naturalSize.height;
  const orientedHeight = rotation % 180 === 0 ? naturalSize.height : naturalSize.width;
  const baseScale =
    orientedWidth && orientedHeight
      ? Math.max(avatarCropSize / orientedWidth, avatarCropSize / orientedHeight)
      : 1;
  const displayWidth = naturalSize.width * baseScale * zoom;
  const displayHeight = naturalSize.height * baseScale * zoom;
  const displayBoundsWidth = orientedWidth * baseScale * zoom;
  const displayBoundsHeight = orientedHeight * baseScale * zoom;
  const clampedPan = clampAvatarPan(pan, displayBoundsWidth, displayBoundsHeight);
  const imageStyle =
    naturalSize.width && naturalSize.height
      ? {
          display: "block",
          height: `${displayHeight}px`,
          left: `${avatarCropStageSize / 2 - displayWidth / 2 + clampedPan.x}px`,
          maxHeight: "none",
          maxWidth: "none",
          top: `${avatarCropStageSize / 2 - displayHeight / 2 + clampedPan.y}px`,
          transform: `rotate(${rotation}deg) scale(${flipX ? -1 : 1}, ${flipY ? -1 : 1})`,
          transformOrigin: "center",
          width: `${displayWidth}px`,
        }
      : undefined;

  useEffect(() => {
    setImageURL(url);
  }, [url]);

  useEffect(() => {
    return () => {
      if (filePreviewURL) URL.revokeObjectURL(filePreviewURL);
    };
  }, [filePreviewURL]);

  function resetDraft() {
    setImageURL(url);
    if (filePreviewURL) URL.revokeObjectURL(filePreviewURL);
    setFilePreviewURL("");
    setSourceFilename("avatar.png");
    setFileError("");
    setPreviewError("");
    setNaturalSize({ width: 0, height: 0 });
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setRotation(0);
    setFlipX(false);
    setFlipY(false);
    setCropEdited(false);
  }

  function prepareUpload(file: File) {
    setFileError("");
    setPreviewError("");
    if (!file.type.startsWith("image/")) {
      setFileError("Choose an image file.");
      return;
    }
    if (filePreviewURL) URL.revokeObjectURL(filePreviewURL);
    setFilePreviewURL(URL.createObjectURL(file));
    setSourceFilename(file.name.replace(/\.[^.]+$/, "") + "-avatar.png");
    setImageURL("");
    setNaturalSize({ width: 0, height: 0 });
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setRotation(0);
    setFlipX(false);
    setFlipY(false);
    setCropEdited(true);
  }

  function beginCropEdit() {
    if (!sourceSrc || sourceKind === "none") return false;
    setCropEdited(true);
    setPreviewError("");
    if (sourceKind === "url") setSourceFilename("remote-avatar.png");
    return true;
  }

  function adjustZoom(delta: number) {
    if (!beginCropEdit()) return;
    setZoom((current) => Math.max(1, Math.min(3, Number((current + delta).toFixed(2)))));
  }

  async function saveAvatar() {
    if (urlValidationError) {
      setPreviewError(urlValidationError);
      return;
    }
    if (!sourceSrc) {
      setPreviewError("Choose an image file or enter an image URL.");
      return;
    }
    setUploading(true);
    try {
      if (cropActive) {
        const image = imageRef.current;
        if (!image || !naturalSize.width || !naturalSize.height) {
          setPreviewError("Wait for the image preview to finish loading before saving.");
          return;
        }
        const blob = await cropAvatarImage(
          image,
          naturalSize,
          zoom,
          clampedPan,
          rotation,
          flipX,
          flipY,
        );
        const payload = await uploadImage(blob, sourceFilename);
        onChange({ assetId: payload.assetId, url: "" });
      } else if (activeURL) {
        onChange({ assetId: "", url: activeURL });
      }
      resetDraft();
      setOpen(false);
    } catch (err) {
      setPreviewError(err instanceof Error ? err.message : "Could not save avatar");
    } finally {
      setUploading(false);
    }
  }

  function resetImageDraft() {
    if (filePreviewURL) URL.revokeObjectURL(filePreviewURL);
    setFilePreviewURL("");
    setFileError("");
    setPreviewError("");
    setNaturalSize({ width: 0, height: 0 });
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setRotation(0);
    setFlipX(false);
    setFlipY(false);
    setCropEdited(false);
  }

  function handleURLChange(value: string) {
    resetImageDraft();
    setImageURL(value);
  }

  function handleCropWheel(event: ReactWheelEvent<HTMLDivElement>) {
    if (!sourceSrc) return;
    event.preventDefault();
    adjustZoom(event.deltaY < 0 ? 0.03 : -0.03);
  }

  function handleCropPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (!sourceSrc) return;
    beginCropEdit();
    dragRef.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      pan: clampedPan,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handleCropPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    setPan(
      clampAvatarPan(
        {
          x: drag.pan.x + event.clientX - drag.x,
          y: drag.pan.y + event.clientY - drag.y,
        },
        displayBoundsWidth,
        displayBoundsHeight,
      ),
    );
  }

  function handleClear() {
    onChange({ assetId: "", url: "" });
    setImageURL("");
    setOpen(false);
  }

  return (
    <AvatarPickerShell
      label={label}
      name={name}
      src={src}
      clearAction={
        src ? (
          <Button type="button" size="sm" variant="ghost" onClick={handleClear}>
            Clear
          </Button>
        ) : null
      }
      changeAction={
        <Modal
          open={open}
          onOpenChange={(nextOpen) => {
            setOpen(nextOpen);
            if (nextOpen) resetDraft();
          }}
          title={`Set ${label.toLowerCase()}`}
          trigger={
            <Button type="button" size="sm" variant="secondary">
              Change avatar
            </Button>
          }
        >
          <AvatarDialogBody
            canSave={canSave}
            cropActive={cropActive}
            error={fileError || urlValidationError || previewError}
            cropSize={avatarCropSize}
            imageRef={imageRef}
            imageStyle={imageStyle}
            imageURL={imageURL}
            label={label}
            name={name}
            sourceSrc={sourceSrc}
            stageSize={avatarCropStageSize}
            uploading={uploading}
            onCancel={() => {
              resetDraft();
              setOpen(false);
            }}
            onClear={handleClear}
            onFile={prepareUpload}
            onFlipX={() => beginCropEdit() && setFlipX((current) => !current)}
            onFlipY={() => beginCropEdit() && setFlipY((current) => !current)}
            onImageError={() =>
              setPreviewError(
                "That image could not be previewed. Check the URL or choose a different image.",
              )
            }
            onImageLoad={(image) => {
              setPreviewError("");
              setNaturalSize({ width: image.naturalWidth, height: image.naturalHeight });
            }}
            onPointerCancel={() => {
              dragRef.current = null;
            }}
            onPointerDown={handleCropPointerDown}
            onPointerMove={handleCropPointerMove}
            onPointerUp={(event) => {
              if (dragRef.current?.pointerId === event.pointerId) dragRef.current = null;
            }}
            onRotate={() => beginCropEdit() && setRotation((current) => (current + 90) % 360)}
            onSave={() => void saveAvatar()}
            onURLChange={handleURLChange}
            onWheel={handleCropWheel}
            onZoom={adjustZoom}
          />
        </Modal>
      }
    />
  );
}

function AvatarPickerShell({
  changeAction,
  clearAction,
  label,
  name,
  src,
}: {
  changeAction: ReactNode;
  clearAction: ReactNode;
  label: string;
  name: string;
  src: string;
}) {
  return (
    <section className="grid gap-3 rounded-lg border border-border bg-card p-3">
      <header className="flex items-center gap-3">
        <AvatarThumb name={name} src={src} />
        <div className="min-w-0 flex-1">
          <h4 className="font-semibold">{label}</h4>
          <p className="text-sm text-muted-foreground">
            Upload a cropped square, use an image URL, or clear the image.
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {changeAction}
            {clearAction}
          </div>
        </div>
      </header>
    </section>
  );
}

function AvatarThumb({ name, src }: { name: string; src: string }) {
  return (
    <figure className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-lg border border-border bg-muted text-lg font-bold text-muted-foreground">
      {src ? (
        <img className="h-full w-full object-cover" src={src} alt="" />
      ) : (
        name.slice(0, 2).toUpperCase() || "AV"
      )}
    </figure>
  );
}

function clampAvatarPan(
  pan: { x: number; y: number },
  displayWidth: number,
  displayHeight: number,
) {
  const maxX = Math.max(0, (displayWidth - avatarCropSize) / 2);
  const maxY = Math.max(0, (displayHeight - avatarCropSize) / 2);
  return {
    x: Math.max(-maxX, Math.min(maxX, pan.x)),
    y: Math.max(-maxY, Math.min(maxY, pan.y)),
  };
}

function validateAvatarURL(value: string) {
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return "Avatar URL must start with http:// or https://.";
    }
    return "";
  } catch {
    return "Enter a valid image URL.";
  }
}

function cropAvatarImage(
  image: HTMLImageElement,
  naturalSize: { width: number; height: number },
  zoom: number,
  pan: { x: number; y: number },
  rotation: number,
  flipX: boolean,
  flipY: boolean,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    try {
      const orientedWidth = rotation % 180 === 0 ? naturalSize.width : naturalSize.height;
      const orientedHeight = rotation % 180 === 0 ? naturalSize.height : naturalSize.width;
      const baseScale = Math.max(avatarCropSize / orientedWidth, avatarCropSize / orientedHeight);
      const scale = baseScale * zoom;
      const displayWidth = naturalSize.width * scale;
      const displayHeight = naturalSize.height * scale;
      const displayBoundsWidth = orientedWidth * scale;
      const displayBoundsHeight = orientedHeight * scale;
      const clampedPan = clampAvatarPan(pan, displayBoundsWidth, displayBoundsHeight);
      const cropLeft = (avatarCropStageSize - avatarCropSize) / 2;
      const cropTop = (avatarCropStageSize - avatarCropSize) / 2;
      const canvas = document.createElement("canvas");
      canvas.width = 512;
      canvas.height = 512;
      const context = canvas.getContext("2d");
      if (!context) {
        reject(new Error("Could not crop image"));
        return;
      }
      const outputScale = 512 / avatarCropSize;
      context.scale(outputScale, outputScale);
      context.translate(
        avatarCropStageSize / 2 + clampedPan.x - cropLeft,
        avatarCropStageSize / 2 + clampedPan.y - cropTop,
      );
      context.rotate((rotation * Math.PI) / 180);
      context.scale(flipX ? -1 : 1, flipY ? -1 : 1);
      context.drawImage(image, -displayWidth / 2, -displayHeight / 2, displayWidth, displayHeight);
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error("Could not crop image"));
        },
        "image/png",
        0.92,
      );
    } catch {
      reject(
        new Error(
          "This image host blocks cropping. Use the URL directly, or upload the image file instead.",
        ),
      );
    }
  });
}

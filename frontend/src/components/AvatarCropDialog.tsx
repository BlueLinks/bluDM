import { RotateCw, ZoomIn, ZoomOut } from "lucide-react";
import { type CSSProperties, type PointerEvent as ReactPointerEvent, type RefObject, type WheelEvent as ReactWheelEvent } from "react";
import { Button, Field, Input } from "./ui";

export function AvatarDialogBody({
  canSave,
  cropActive,
  cropSize,
  error,
  imageRef,
  imageStyle,
  imageURL,
  label,
  name,
  sourceSrc,
  stageSize,
  uploading,
  onCancel,
  onClear,
  onFile,
  onFlipX,
  onFlipY,
  onImageError,
  onImageLoad,
  onPointerCancel,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onRotate,
  onSave,
  onURLChange,
  onWheel,
  onZoom
}: {
  canSave: boolean;
  cropActive: boolean;
  cropSize: number;
  error: string;
  imageRef: RefObject<HTMLImageElement | null>;
  imageStyle?: CSSProperties;
  imageURL: string;
  label: string;
  name: string;
  sourceSrc: string;
  stageSize: number;
  uploading: boolean;
  onCancel: () => void;
  onClear: () => void;
  onFile: (file: File) => void;
  onFlipX: () => false | void;
  onFlipY: () => false | void;
  onImageError: () => void;
  onImageLoad: (image: HTMLImageElement) => void;
  onPointerCancel: () => void;
  onPointerDown: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onPointerMove: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onPointerUp: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onRotate: () => false | void;
  onSave: () => void;
  onURLChange: (value: string) => void;
  onWheel: (event: ReactWheelEvent<HTMLDivElement>) => void;
  onZoom: (delta: number) => void;
}) {
  return (
    <section className="grid gap-4">
      <AvatarCropPreview
        cropActive={cropActive}
        cropSize={cropSize}
        imageRef={imageRef}
        imageStyle={imageStyle}
        label={label}
        name={name}
        sourceSrc={sourceSrc}
        stageSize={stageSize}
        onImageError={onImageError}
        onImageLoad={onImageLoad}
        onPointerCancel={onPointerCancel}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onWheel={onWheel}
      />
      <AvatarCropTools enabled={Boolean(sourceSrc)} onFlipX={onFlipX} onFlipY={onFlipY} onRotate={onRotate} onZoom={onZoom} />
      <AvatarInputs imageURL={imageURL} onFile={onFile} onURLChange={onURLChange} />
      {error && <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
      <AvatarDialogActions canSave={canSave} uploading={uploading} onCancel={onCancel} onClear={onClear} onSave={onSave} />
    </section>
  );
}

function AvatarCropPreview({
  cropActive,
  cropSize,
  imageRef,
  imageStyle,
  label,
  name,
  sourceSrc,
  stageSize,
  onImageError,
  onImageLoad,
  onPointerCancel,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onWheel
}: {
  cropActive: boolean;
  cropSize: number;
  imageRef: RefObject<HTMLImageElement | null>;
  imageStyle?: CSSProperties;
  label: string;
  name: string;
  sourceSrc: string;
  stageSize: number;
  onImageError: () => void;
  onImageLoad: (image: HTMLImageElement) => void;
  onPointerCancel: () => void;
  onPointerDown: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onPointerMove: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onPointerUp: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onWheel: (event: ReactWheelEvent<HTMLDivElement>) => void;
}) {
  return (
    <section className="grid gap-3">
      <div
        className="relative mx-auto overflow-hidden rounded-lg border border-border bg-muted text-sm font-semibold text-muted-foreground"
        style={{ width: stageSize, height: stageSize, touchAction: "none" }}
        onWheel={onWheel}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
      >
        {sourceSrc ? (
          <img
            ref={imageRef}
            className={cropActive ? "absolute select-none" : "h-full w-full object-cover"}
            draggable={false}
            style={cropActive ? imageStyle : undefined}
            src={sourceSrc}
            alt={`${label} preview`}
            onLoad={(event) => onImageLoad(event.currentTarget)}
            onError={onImageError}
          />
        ) : (
          <span className="absolute inset-0 grid place-items-center">{name.slice(0, 2).toUpperCase() || "AV"}</span>
        )}
        {sourceSrc && cropActive && <AvatarCropMask cropSize={cropSize} stageSize={stageSize} />}
      </div>
      <p className="text-sm text-muted-foreground">{sourceSrc ? "Scroll over the image to zoom, drag to pan, or use the rotate and flip tools." : "Preview your avatar here before saving it."}</p>
    </section>
  );
}

function AvatarCropMask({ cropSize, stageSize }: { cropSize: number; stageSize: number }) {
  const cropInset = (stageSize - cropSize) / 2;
  return (
    <>
      <div className="pointer-events-none absolute left-0 top-0 bg-black/45" style={{ width: "100%", height: cropInset }} />
      <div className="pointer-events-none absolute left-0 bg-black/45" style={{ top: cropInset, width: cropInset, height: cropSize }} />
      <div className="pointer-events-none absolute right-0 bg-black/45" style={{ top: cropInset, width: cropInset, height: cropSize }} />
      <div className="pointer-events-none absolute bottom-0 left-0 bg-black/45" style={{ width: "100%", height: cropInset }} />
      <div className="pointer-events-none absolute border-2 border-sky-400 shadow-[0_0_0_1px_rgba(255,255,255,0.7)]" style={{ left: cropInset, top: cropInset, width: cropSize, height: cropSize }} />
    </>
  );
}

function AvatarCropTools({
  enabled,
  onFlipX,
  onFlipY,
  onRotate,
  onZoom
}: {
  enabled: boolean;
  onFlipX: () => false | void;
  onFlipY: () => false | void;
  onRotate: () => false | void;
  onZoom: (delta: number) => void;
}) {
  if (!enabled) return null;
  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      <Button type="button" size="sm" variant="secondary" icon={ZoomOut} onClick={() => onZoom(-0.03)}>Less</Button>
      <Button type="button" size="sm" variant="secondary" onClick={onFlipX}>Flip H</Button>
      <Button type="button" size="sm" variant="secondary" icon={RotateCw} onClick={onRotate}>Rotate</Button>
      <Button type="button" size="sm" variant="secondary" onClick={onFlipY}>Flip V</Button>
      <Button type="button" size="sm" variant="secondary" icon={ZoomIn} onClick={() => onZoom(0.03)}>More</Button>
    </div>
  );
}

function AvatarInputs({ imageURL, onFile, onURLChange }: { imageURL: string; onFile: (file: File) => void; onURLChange: (value: string) => void }) {
  return (
    <>
      <Field label="Upload image">
        <Input
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) onFile(file);
          }}
        />
      </Field>
      <p className="text-sm text-muted-foreground">Uploaded images are saved as a cropped square avatar.</p>
      <Field label="Image URL">
        <Input value={imageURL} onChange={(event) => onURLChange(event.target.value)} placeholder="https://..." />
      </Field>
    </>
  );
}

function AvatarDialogActions({
  canSave,
  uploading,
  onCancel,
  onClear,
  onSave
}: {
  canSave: boolean;
  uploading: boolean;
  onCancel: () => void;
  onClear: () => void;
  onSave: () => void;
}) {
  return (
    <footer className="flex justify-between gap-2">
      <Button type="button" variant="danger" onClick={onClear}>Clear image</Button>
      <div className="flex gap-2">
        <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button type="button" disabled={uploading || !canSave} onClick={onSave}>{uploading ? "Saving..." : "Save avatar"}</Button>
      </div>
    </footer>
  );
}

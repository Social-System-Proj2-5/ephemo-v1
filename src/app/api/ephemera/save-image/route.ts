import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

export const runtime = "nodejs";

type SaveFormat = "jpeg" | "pdf";

type PdfTextLine = {
  text: string;
  x: number;
  y: number;
  fontSize: number;
  rotation: number;
};

function sanitizeFileName(value: string) {
  const sanitized = value
    .trim()
    .replace(/[\\/:*?"<>|]/g, "-")
    .replace(/\s+/g, "-")
    .slice(0, 80);

  return sanitized || "ephemera";
}

function encodeUtf16BeHex(value: string) {
  const bytes: number[] = [];

  for (const character of value) {
    const codePoint = character.codePointAt(0) ?? 0;

    if (codePoint > 0xffff) {
      const high = Math.floor((codePoint - 0x10000) / 0x400) + 0xd800;
      const low = ((codePoint - 0x10000) % 0x400) + 0xdc00;
      bytes.push(high >> 8, high & 0xff, low >> 8, low & 0xff);
    } else {
      bytes.push(codePoint >> 8, codePoint & 0xff);
    }
  }

  return Buffer.from(bytes).toString("hex").toUpperCase();
}

function createTextContent(lines: PdfTextLine[]) {
  if (lines.length === 0) {
    return "";
  }

  const commands = ["BT", "/F1 1 Tf", "3 Tr"];

  lines.forEach((line) => {
    if (!line.text) {
      return;
    }

    const radians = (line.rotation * Math.PI) / 180;
    const cos = Math.cos(radians);
    const sin = Math.sin(radians);
    const hexText = encodeUtf16BeHex(line.text);

    commands.push(
      `/F1 ${line.fontSize.toFixed(2)} Tf`,
      `${cos.toFixed(5)} ${sin.toFixed(5)} ${(-sin).toFixed(5)} ${cos.toFixed(5)} ${line.x.toFixed(2)} ${line.y.toFixed(2)} Tm`,
      `<${hexText}> Tj`,
    );
  });

  commands.push("ET");

  return `${commands.join("\n")}\n`;
}

function createPdfFromJpeg(
  bytes: Buffer,
  width: number,
  height: number,
  textLines: PdfTextLine[],
) {
  const chunks: Buffer[] = [];
  const offsets: number[] = [];
  let size = 0;

  function append(value: string | Buffer) {
    const chunk = Buffer.isBuffer(value) ? value : Buffer.from(value, "binary");
    chunks.push(chunk);
    size += chunk.length;
  }

  function startObject(id: number) {
    offsets[id] = size;
    append(`${id} 0 obj\n`);
  }

  const content = `q\n${width} 0 0 ${height} 0 0 cm\n/Im0 Do\nQ\n${createTextContent(textLines)}`;

  append("%PDF-1.4\n%\xFF\xFF\xFF\xFF\n");

  startObject(1);
  append("<< /Type /Catalog /Pages 2 0 R >>\nendobj\n");

  startObject(2);
  append("<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n");

  startObject(3);
  append(
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${width} ${height}] /Resources << /XObject << /Im0 4 0 R >> /Font << /F1 6 0 R >> >> /Contents 5 0 R >>\nendobj\n`,
  );

  startObject(4);
  append(
    `<< /Type /XObject /Subtype /Image /Width ${width} /Height ${height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${bytes.length} >>\nstream\n`,
  );
  append(bytes);
  append("\nendstream\nendobj\n");

  startObject(5);
  append(`<< /Length ${Buffer.byteLength(content)} >>\nstream\n`);
  append(content);
  append("endstream\nendobj\n");

  startObject(6);
  append(
    "<< /Type /Font /Subtype /Type0 /BaseFont /HeiseiKakuGo-W5 /Encoding /UniJIS-UCS2-H /DescendantFonts [7 0 R] >>\nendobj\n",
  );

  startObject(7);
  append(
    "<< /Type /Font /Subtype /CIDFontType0 /BaseFont /HeiseiKakuGo-W5 /CIDSystemInfo << /Registry (Adobe) /Ordering (Japan1) /Supplement 5 >> /FontDescriptor 8 0 R >>\nendobj\n",
  );

  startObject(8);
  append(
    "<< /Type /FontDescriptor /FontName /HeiseiKakuGo-W5 /Flags 6 /FontBBox [0 -200 1000 900] /ItalicAngle 0 /Ascent 880 /Descent -120 /CapHeight 700 /StemV 80 >>\nendobj\n",
  );

  const xrefOffset = size;
  append("xref\n0 9\n0000000000 65535 f \n");

  for (let id = 1; id <= 8; id += 1) {
    append(`${String(offsets[id]).padStart(10, "0")} 00000 n \n`);
  }

  append(
    `trailer\n<< /Size 9 /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`,
  );

  return Buffer.concat(chunks);
}

function parseTextLayers(value: FormDataEntryValue | null) {
  if (typeof value !== "string") {
    return [];
  }

  try {
    const parsed = JSON.parse(value);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(
      (line): line is PdfTextLine =>
        typeof line?.text === "string" &&
        typeof line?.x === "number" &&
        typeof line?.y === "number" &&
        typeof line?.fontSize === "number" &&
        typeof line?.rotation === "number",
    );
  } catch {
    return [];
  }
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get("file");
  const name = formData.get("name");
  const format = formData.get("format");
  const width = Number(formData.get("width") ?? 1448);
  const height = Number(formData.get("height") ?? 1086);
  const textLayers = formData.get("textLayers");

  if (!(file instanceof File)) {
    return Response.json({ error: "JPEG file is required." }, { status: 400 });
  }

  const saveFormat: SaveFormat = format === "pdf" ? "pdf" : "jpeg";
  const safeName = sanitizeFileName(typeof name === "string" ? name : "");
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const extension = saveFormat === "pdf" ? "pdf" : "jpg";
  const fileName = `${safeName}-${timestamp}.${extension}`;
  const relativePath = path.join("ephemera", "saved", fileName);
  const saveDirectory = path.join(process.cwd(), "public", "ephemera", "saved");
  const savePath = path.join(saveDirectory, fileName);
  const bytes = Buffer.from(await file.arrayBuffer());
  const parsedTextLayers =
    saveFormat === "pdf" ? parseTextLayers(textLayers) : [];
  const outputBytes =
    saveFormat === "pdf"
      ? createPdfFromJpeg(bytes, width, height, parsedTextLayers)
      : bytes;

  await mkdir(saveDirectory, { recursive: true });
  await writeFile(savePath, outputBytes);

  return Response.json({
    fileName,
    url: `/${relativePath.replaceAll(path.sep, "/")}`,
  });
}

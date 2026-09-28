import { describe, it, expect } from "vitest";
import JSZip from "jszip";
import { getFileExtension, isSupportedFile, isSparse, extractText } from "../fileParser";

function makeDocx() {
  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p><w:r><w:t>Anshita Resume</w:t></w:r></w:p>
    <w:p><w:r><w:t>React Developer with HTML CSS JavaScript experience.</w:t></w:r></w:p>
  </w:body>
</w:document>`;
  const contentTypeXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`;
  const relsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;

  const zip = new JSZip();
  zip.file("[Content_Types].xml", contentTypeXml);
  zip.folder("_rels").file(".rels", relsXml);
  zip.folder("word").file("document.xml", documentXml);
  return zip.generateAsync({ type: "nodebuffer" });
}

describe("getFileExtension", () => {
  it("extracts lowercase extensions", () => {
    expect(getFileExtension("resume.PDF")).toBe("pdf");
    expect(getFileExtension("CV.docx")).toBe("docx");
  });

  it("returns an empty string when there is no extension", () => {
    expect(getFileExtension("resume")).toBe("");
  });
});

describe("isSupportedFile", () => {
  it("accepts pdf, docx, txt, and images", () => {
    expect(isSupportedFile({ name: "a.pdf" })).toBe(true);
    expect(isSupportedFile({ name: "a.docx" })).toBe(true);
    expect(isSupportedFile({ name: "a.txt" })).toBe(true);
    expect(isSupportedFile({ name: "a.png" })).toBe(true);
  });

  it("rejects unknown formats", () => {
    expect(isSupportedFile({ name: "a.xyz" })).toBe(false);
    expect(isSupportedFile({ name: "" })).toBe(false);
    expect(isSupportedFile({})).toBe(false);
  });
});

describe("isSparse", () => {
  it("detects empty or near-empty text", () => {
    expect(isSparse("")).toBe(true);
    expect(isSparse("   ")).toBe(true);
    expect(isSparse("short")).toBe(true);
  });

  it("accepts meaningful text", () => {
    expect(isSparse("A".repeat(60))).toBe(false);
  });
});

describe("extractText", () => {
  it("extracts plain text from txt files", async () => {
    const file = new File(["React developer with HTML and CSS."], "resume.txt", {
      type: "text/plain",
    });
    expect(await extractText(file)).toBe("React developer with HTML and CSS.");
  });

  it("extracts text from docx files", async () => {
    const buffer = await makeDocx();
    const file = new File([buffer], "resume.docx", {
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });
    const text = await extractText(file);
    expect(text).toContain("Anshita Resume");
    expect(text).toContain("React Developer");
  });
});

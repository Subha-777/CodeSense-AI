import jsPDF from "jspdf";

export function generateReviewPDF({ code, language, review }) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const maxWidth = pageWidth - margin * 2;
  let y = margin;

  const addPageIfNeeded = (lineHeight = 7) => {
    if (y + lineHeight > pageHeight - margin) {
      doc.addPage();
      y = margin;
    }
  };

  // Title
  doc.setFontSize(18);
  doc.setFont(undefined, "bold");
  doc.text("CodeSense AI - Code Review Report", margin, y);
  y += 10;

  doc.setFontSize(10);
  doc.setFont(undefined, "normal");
  doc.setTextColor(100);
  doc.text(`Generated: ${new Date().toLocaleString()}`, margin, y);
  y += 6;
  doc.text(`Language: ${language}`, margin, y);
  y += 10;
  doc.setTextColor(0);

  // Original Code section
  doc.setFontSize(13);
  doc.setFont(undefined, "bold");
  addPageIfNeeded();
  doc.text("Original Code", margin, y);
  y += 7;

  doc.setFont("courier", "normal");
  doc.setFontSize(9);
  const codeLines = doc.splitTextToSize(code, maxWidth);
  codeLines.forEach((line) => {
    addPageIfNeeded(5);
    doc.text(line, margin, y);
    y += 5;
  });
  y += 8;

  // AI Review section
  doc.setFont(undefined, "bold");
  doc.setFontSize(13);
  addPageIfNeeded();
  doc.text("AI Review", margin, y);
  y += 7;

  doc.setFont(undefined, "normal");
  doc.setFontSize(10);

  // Strip markdown symbols for cleaner PDF text
  const cleanedReview = review
    .replace(/```[\s\S]*?```/g, (match) => match.replace(/```/g, ""))
    .replace(/#{1,6}\s*/g, "")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1");

  const reviewLines = doc.splitTextToSize(cleanedReview, maxWidth);
  reviewLines.forEach((line) => {
    addPageIfNeeded(6);
    doc.text(line, margin, y);
    y += 6;
  });

  doc.save(`codesense-review-${Date.now()}.pdf`);
}
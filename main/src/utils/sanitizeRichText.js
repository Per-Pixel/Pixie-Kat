const allowedTags = new Set(["P", "BR", "STRONG", "B", "EM", "I", "H2", "H3", "UL", "OL", "LI", "A"]);

export function sanitizeRichText(value) {
  if (!value || typeof DOMParser === "undefined") return value || "";
  const document = new DOMParser().parseFromString(value, "text/html");
  Array.from(document.body.querySelectorAll("*")).forEach((node) => {
    if (!allowedTags.has(node.tagName)) {
      node.replaceWith(...Array.from(node.childNodes));
      return;
    }
    Array.from(node.attributes).forEach((attribute) => {
      if (node.tagName !== "A" || attribute.name !== "href") node.removeAttribute(attribute.name);
    });
    if (node.tagName === "A") {
      const href = node.getAttribute("href") || "";
      if (!/^https?:\/\//i.test(href) && !href.startsWith("/")) node.removeAttribute("href");
      node.setAttribute("target", "_blank");
      node.setAttribute("rel", "noopener noreferrer");
    }
  });
  return document.body.innerHTML;
}

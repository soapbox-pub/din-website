// Elements with .rise settle into place as they scroll into view.

const items = document.querySelectorAll<HTMLElement>(".rise");

// This script is running, so it takes over from the CSS fallback that shows
// .rise elements anyway after a moment.
document.documentElement.classList.add("rising");

if ("IntersectionObserver" in window) {
  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add("in");
        io.unobserve(entry.target);
      }
    },
    { rootMargin: "0px 0px -8% 0px", threshold: 0.08 },
  );
  items.forEach((el) => io.observe(el));
} else {
  items.forEach((el) => el.classList.add("in"));
}

export function SiteFooter() {
  return (
    <footer className="border-t border-hairline bg-canvas">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-6 sm:px-6 lg:px-8">
        <p className="text-xs text-body">
          &copy; 2026 Dr. Token System. All rights reserved.
        </p>
        <a
          href="https://pixelperfects.in/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-xs text-mute hover:text-ink transition-colors"
        >
          Security and Infrastructure
          <img
            src="https://media.pixelperfects.in/pixelperfect03.png"
            alt="PixelPerfect"
              className="h-4 w-auto inline-block"
            />
            pixelperfects.in
          </a>
      </div>
    </footer>
  );
}

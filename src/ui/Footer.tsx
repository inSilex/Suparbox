import layoutStyles from '../styles/layout.module.css'

interface FooterProps {
  install?: { prompt: BeforeInstallPromptEvent | null; dismissed: boolean; install: () => void }
}

export function Footer({ install }: FooterProps) {
  const hasGitHub = import.meta.env.VITE_GITHUB_URL
  const hasInstall = install?.prompt && !install.dismissed

  if (!hasGitHub && !hasInstall) return null

  return (
    <footer className={layoutStyles.footer}>
      <a href="/tos.txt" target="_blank" rel="noopener noreferrer" className={layoutStyles.footerItem}>
        Privacy Policy
      </a>
      {hasInstall ? (
        <>
          <span className={layoutStyles.footerSeparator}>|</span>
          <a href="#" onClick={(e) => { e.preventDefault(); install.install(); }} className={layoutStyles.footerItem}>
            Install to homescreen
          </a>
        </>
      ) : null}
      {hasGitHub && (
        <>
          <span className={layoutStyles.footerSeparator}>|</span>
          <a href={import.meta.env.VITE_GITHUB_URL} target="_blank" rel="noopener noreferrer">
            GitHub
          </a>
        </>
      )}
    </footer>
  )
}

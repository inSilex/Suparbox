declare const __GOOGLE_CLIENT_ID__: string
declare const __GOOGLE_CLIENT_SECRET__: string

interface BeforeInstallPromptEvent extends Event {
  readonly prompt: () => Promise<void>
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

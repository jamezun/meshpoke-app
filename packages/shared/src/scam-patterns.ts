/** T13.2 scam pattern library — HK context (PRD §7.2). Pure functions, shared web+api+mobile. */

export type ScamFlags = {
  'scam-crypto': boolean;
  'scam-investment': boolean;
  'scam-move-offplatform': boolean;
  'scam-download': boolean;
  'contact-phone': boolean;
  'contact-handle': boolean;
  'contact-email': boolean;
  'link-detected': boolean;
};

const RE = {
  crypto: /(bitcoin|btc|ethereum|eth|usdt|泰达币|比特[币]|虚拟货币|crypto(\s*(currency|coin|trading))?|炒币)/i,
  investment: /(guaranteed.{0,20}(return|profit)|稳赚|保本|高回報|高回报|investment\s+opportunit|投資機會|投资机会|內幕消息|insider trading)/i,
  moveOff: /(telegram|whatsapp|signal|line[ ]?(id|app)|加我.{0,6}(whatsapp|tg|telegram|signal)|dm\s+me\s+on|add\s+my\s+(wa|tg)|移步|私聊我)/i,
  download: /(download\s+(this|the)\s+app|点击下载|點擊下載|下载链接|下載鏈接|install\s+this\s+app|apk)/i,
  phone: /(\+?852[\s-]?\d{4}[\s-]?\d{4}|\b[6-9]\d{3}[\s-]?\d{4}\b)/,
  handle: /(^|\s)@[a-z0-9._]{3,30}\b/i,
  email: /\b[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}\b/i,
  link: /(https?:\/\/|www\.|\b[a-z0-9-]+\.(com|net|org|hk|io|xyz|link|vip)(\/|\b))/i,
};

/** Flags on SEND: sender sees interstitial (requireConfirm). */
export function scanOutgoing(text: string): { flags: ScamFlags; requireConfirm: boolean } {
  const flags: ScamFlags = {
    'scam-crypto': RE.crypto.test(text),
    'scam-investment': RE.investment.test(text),
    'scam-move-offplatform': RE.moveOff.test(text),
    'scam-download': RE.download.test(text),
    'contact-phone': RE.phone.test(text),
    'contact-handle': RE.handle.test(text),
    'contact-email': RE.email.test(text),
    'link-detected': RE.link.test(text),
  };
  // contacts/links alone = confirm-worthy; scam patterns always confirm-worthy
  const requireConfirm = flags['scam-crypto'] || flags['scam-investment']
    || flags['scam-move-offplatform'] || flags['scam-download']
    || flags['contact-phone'] || flags['contact-handle'] || flags['contact-email']
    || flags['link-detected'];
  return { flags, requireConfirm };
}

/** Flags on RECEIVE: warning banner for the recipient. */
export function scanIncoming(text: string): { flags: ScamFlags; warn: boolean } {
  const { flags } = scanOutgoing(text);
  const warn = flags['scam-crypto'] || flags['scam-investment']
    || flags['scam-move-offplatform'] || flags['scam-download'];
  return { flags, warn };
}

/** Scameter (HK Cyberdefender) lookup link for the report flow. */
export function scameterUrl(query: string): string {
  return `https://cyberdefender.hk/en/scameter/?q=${encodeURIComponent(query)}`;
}

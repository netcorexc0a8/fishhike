import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, setSetting } from '../db';
import { Icon, type IconName } from './Icon';
import {
  canPromptInstall,
  detectPlatform,
  isIpad,
  isStandalone,
  promptInstall,
  subscribeInstall,
  wasInstalledNow,
} from '../lib/install';

export const INSTALL_KEY = 'installPromptDone';
/** Событие для повторного показа экрана установки (кнопка на экране «Места»). */
export const INSTALL_EVENT = 'fishhike:install';

const BENEFITS: { icon: IconName; text: string }[] = [
  { icon: 'wifiOff', text: 'Работает без интернета — на воде связи часто нет' },
  { icon: 'expand', text: 'Полный экран, без адресной строки' },
  { icon: 'fish', text: 'Иконка на главном экране, запуск в одно касание' },
];

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="inst-step">
      <span className="inst-num" aria-hidden="true">{n}</span>
      <span>{children}</span>
    </li>
  );
}

/**
 * Экран установки перед первым обучением. onVisibleChange сообщает App,
 * идёт ли установка, чтобы обучение дождалось её завершения.
 */
export function InstallScreen({ onVisibleChange }: { onVisibleChange: (visible: boolean) => void }) {
  const done = useLiveQuery(() => db.settings.get(INSTALL_KEY).then((s) => s?.value === '1'), []);
  const canPrompt = useSyncExternalStore(subscribeInstall, canPromptInstall);
  const installedEvent = useSyncExternalStore(subscribeInstall, wasInstalledNow);
  const [accepted, setAccepted] = useState(false);
  const justInstalled = installedEvent || accepted;
  const [forced, setForced] = useState(false);
  const [busy, setBusy] = useState(false);
  const primaryRef = useRef<HTMLButtonElement>(null);

  const platform = detectPlatform();
  const standalone = isStandalone();
  // Автоматически — только на телефонах и планшетах; на компьютере экран открывается вручную.
  const eligible = !standalone && platform !== 'desktop';
  const visible = forced || (done === false && eligible);

  useEffect(() => {
    // Пока настройка не прочитана, обучение тоже ждёт.
    onVisibleChange(done === undefined ? true : visible);
  }, [done, visible]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const open = () => setForced(true);
    window.addEventListener(INSTALL_EVENT, open);
    return () => window.removeEventListener(INSTALL_EVENT, open);
  }, []);

  useEffect(() => {
    if (visible) primaryRef.current?.focus();
  }, [visible, canPrompt, justInstalled]);

  const close = async () => {
    setForced(false);
    await setSetting(INSTALL_KEY, '1');
  };

  const install = async () => {
    setBusy(true);
    try {
      // Флаг сохраняем по «Продолжить», чтобы пользователь увидел подтверждение.
      if (await promptInstall()) setAccepted(true);
    } finally {
      setBusy(false);
    }
  };

  if (!visible) return null;

  const ipad = isIpad();

  return (
    <div className="inst-backdrop">
      <div className="inst-card" role="dialog" aria-modal="true" aria-labelledby="inst-title">
        <img src="icon-192.png" alt="" width="72" height="72" className="inst-icon" />
        <h1 id="inst-title" className="inst-title">
          {justInstalled ? 'FishHike установлен' : 'Установите FishHike'}
        </h1>

        {justInstalled ? (
          <p className="onb-text" style={{ textAlign: 'center' }}>
            Иконка появилась на главном экране. Можно открыть приложение оттуда или продолжить здесь — данные общие.
          </p>
        ) : (
          <ul className="inst-benefits">
            {BENEFITS.map((b) => (
              <li key={b.text}>
                <span className="inst-bicon" aria-hidden="true"><Icon name={b.icon} size={18} /></span>
                {b.text}
              </li>
            ))}
          </ul>
        )}

        {!justInstalled && canPrompt && (
          <button ref={primaryRef} className="btn btn-primary btn-block" onClick={install} disabled={busy}>
            <Icon name="download" /> Установить
          </button>
        )}

        {!justInstalled && !canPrompt && platform === 'ios' && (
          <div className="inst-howto">
            <ol className="inst-steps">
              <Step n={1}>
                Нажмите <b>«Поделиться»</b> <span className="inst-glyph"><Icon name="share" size={16} /></span>{' '}
                {ipad ? 'вверху экрана' : 'внизу экрана'}
              </Step>
              <Step n={2}>
                Выберите <b>«На экран „Домой“»</b> <span className="inst-glyph"><Icon name="plusSquare" size={16} /></span>
              </Step>
              <Step n={3}>Нажмите <b>«Добавить»</b> и откройте FishHike с главного экрана</Step>
            </ol>
            <p className="inst-note">
              На iPhone установленное приложение хранит данные отдельно от браузера — лучше установить сразу, до первых записей.
            </p>
          </div>
        )}

        {!justInstalled && !canPrompt && platform !== 'ios' && (
          <div className="inst-howto">
            <ol className="inst-steps">
              <Step n={1}>
                Откройте меню браузера <span className="inst-glyph"><Icon name="moreV" size={16} /></span>
              </Step>
              <Step n={2}>
                Выберите <b>«Установить приложение»</b> или <b>«Добавить на главный экран»</b>
              </Step>
            </ol>
          </div>
        )}

        <button
          ref={canPrompt && !justInstalled ? undefined : primaryRef}
          className={'btn btn-block' + (justInstalled || (!canPrompt && platform === 'ios') ? ' btn-primary' : '')}
          onClick={close}
        >
          {justInstalled ? 'Продолжить' : platform === 'ios' && !canPrompt ? 'Понятно, продолжить в браузере' : 'Позже'}
        </button>
      </div>
    </div>
  );
}

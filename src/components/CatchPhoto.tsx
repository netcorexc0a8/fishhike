import type { Catch } from '../db';
import { speciesPhoto } from '../lib/catches';
import { Icon } from './Icon';

/** Фото записи: своё, иначе снимок вида, иначе значок рыбы. */
export function CatchPhoto({ c, className }: { c: Pick<Catch, 'photo' | 'species'>; className?: string }) {
  const src = c.photo ?? speciesPhoto(c.species)?.src;
  return (
    <div className={'catch-photo' + (className ? ' ' + className : '')}>
      {src ? <img src={src} alt="" loading="lazy" /> : <Icon name="fish" size={26} />}
    </div>
  );
}

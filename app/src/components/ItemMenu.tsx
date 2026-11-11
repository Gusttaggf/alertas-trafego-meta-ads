'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function ItemMenu({ href, texto, numero }: { href: string; texto: string; numero?: number }) {
  const atual = usePathname()?.startsWith(href);
  return (
    <Link className="item" href={href} aria-current={atual ? 'page' : undefined}>
      <span>{texto}</span>
      {numero ? <span className="badge num">{numero}</span> : null}
    </Link>
  );
}

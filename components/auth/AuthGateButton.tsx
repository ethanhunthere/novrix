'use client';

import Link from 'next/link';

export function AuthGateButton({
  href = '/sentiment',
  children,
  className,
  style,
}: {
  href?: string;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <Link href={href} className={className} style={style}>
      {children}
    </Link>
  );
}

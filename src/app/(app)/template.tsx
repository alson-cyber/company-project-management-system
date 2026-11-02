/**
 * Re-rendered on every top-level navigation, so each page eases in gently.
 * Pages lay out their own blocks; the stagger makes them arrive one after another.
 */
export default function AppTemplate({ children }: { children: React.ReactNode }) {
  return <div className="stagger">{children}</div>;
}

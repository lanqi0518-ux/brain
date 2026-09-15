export default function PageHeader({
    kicker,
    title,
    subtitle,
    children,
}: {
    kicker: string;
    title: string;
    subtitle: string;
    children?: React.ReactNode;
}) {
    return (
        <section className="border-b border-ink-700">
            <div className="container-x pt-20 pb-16">
                <div className="eyebrow">{kicker}</div>
                <h1 className="mt-6 text-display font-medium tracking-tight text-spark">{title}</h1>
                <p className="mt-6 max-w-2xl text-lg text-ink-100 leading-relaxed">{subtitle}</p>
                {children && <div className="mt-8">{children}</div>}
            </div>
        </section>
    );
}

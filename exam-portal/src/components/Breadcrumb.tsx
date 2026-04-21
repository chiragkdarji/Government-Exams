import Link from "next/link";

interface BreadcrumbItem {
  name: string;
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  separatorColor?: string;
  textColor?: string;
  activeColor?: string;
  id?: string;
}

const BASE_URL = "https://rizzjobs.in";

export default function Breadcrumb({
  items,
  separatorColor = "#374151",
  textColor = "#6b7280",
  activeColor = "#f9fafb",
  id,
}: BreadcrumbProps) {
  const schemaId = id ? `breadcrumb-schema-${id}` : "breadcrumb-schema";

  const schema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, idx) => ({
      "@type": "ListItem",
      position: idx + 1,
      name: item.name,
      ...(item.href ? { item: `${BASE_URL}${item.href}` } : {}),
    })),
  };

  return (
    <>
      <script
        id={schemaId}
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
      <nav aria-label="Breadcrumb">
        <ol className="flex items-center flex-wrap gap-1 text-xs">
          {items.map((item, idx) => {
            const isLast = idx === items.length - 1;
            return (
              <li key={idx} className="flex items-center gap-1">
                {idx > 0 && (
                  <span style={{ color: separatorColor }} aria-hidden="true">
                    /
                  </span>
                )}
                {isLast || !item.href ? (
                  <span
                    style={{ color: isLast ? activeColor : textColor }}
                    aria-current={isLast ? "page" : undefined}
                  >
                    {item.name}
                  </span>
                ) : (
                  <Link
                    href={item.href}
                    style={{ color: textColor }}
                    className="hover:underline transition-colors"
                  >
                    {item.name}
                  </Link>
                )}
              </li>
            );
          })}
        </ol>
      </nav>
    </>
  );
}

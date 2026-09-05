import { formatChf, groupMenu, MENU_DIETARY_TAGS, type MenuItem } from "@/lib/menu";

export default function TruckMenu({ items }: { items: MenuItem[] }) {
  if (items.length === 0) return null;
  const groups = groupMenu(items);

  return (
    <div className="mt-3 divide-y divide-neutral-100 overflow-hidden rounded-2xl border border-neutral-100 shadow-card">
      {groups.map((group) => (
        <div key={group.category || "_"} className="px-4 py-4 sm:px-5">
          {group.category && (
            <h3 className="mb-2.5 text-xs font-bold uppercase tracking-wider text-neutral-400">
              {group.category}
            </h3>
          )}
          <ul className="space-y-3">
            {group.items.map((item, i) => {
              const price = formatChf(item.price);
              return (
                <li key={i} className={item.sold_out ? "opacity-50" : ""}>
                  <div className="flex items-baseline gap-3">
                    <span className="font-semibold text-neutral-900">
                      {item.name}
                      {item.sold_out && (
                        <span className="ml-2 rounded-full bg-neutral-100 px-2 py-0.5 align-middle text-[10px] font-bold uppercase tracking-wide text-neutral-500">
                          Sold out
                        </span>
                      )}
                    </span>
                    <span className="mx-1 min-w-[1rem] flex-1 translate-y-[-3px] border-b border-dotted border-neutral-200" />
                    {price && (
                      <span className="flex-shrink-0 text-sm font-medium tabular-nums text-neutral-600">
                        {price}
                      </span>
                    )}
                  </div>
                  {item.description && (
                    <p className="mt-0.5 text-sm leading-relaxed text-neutral-500">{item.description}</p>
                  )}
                  {item.dietary && item.dietary.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {item.dietary.map((id) => {
                        const tag = MENU_DIETARY_TAGS.find((t) => t.id === id);
                        if (!tag) return null;
                        return (
                          <span
                            key={id}
                            className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${tag.className}`}
                          >
                            {tag.label}
                          </span>
                        );
                      })}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}

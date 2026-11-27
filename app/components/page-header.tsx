import type { ReactNode } from "react";
import { Link } from "react-router";

export type Breadcrumb = {
  label: string;
  to?: string;
};

type PageHeaderProps = {
  breadcrumbs: Breadcrumb[];
  title: string;
  description?: string;
  actions?: ReactNode;
};

export function PageHeader({
  breadcrumbs,
  title,
  description,
  actions,
}: PageHeaderProps) {
  return (
    <header className="space-y-4">
      <nav aria-label="Breadcrumb">
        <ol className="flex flex-wrap items-center gap-1.5 text-xs text-slate-400">
          {breadcrumbs.map((item, index) => {
            const current = index === breadcrumbs.length - 1;

            return (
              <li
                key={`${item.label}-${index}`}
                className="flex items-center gap-1.5"
              >
                {index > 0 ? (
                  <span aria-hidden="true">/</span>
                ) : null}

                {item.to && !current ? (
                  <Link
                    to={item.to}
                    className="transition hover:text-slate-700"
                  >
                    {item.label}
                  </Link>
                ) : (
                  <span
                    className={
                      current ? "text-slate-600" : undefined
                    }
                    aria-current={
                      current ? "page" : undefined
                    }
                  >
                    {item.label}
                  </span>
                )}
              </li>
            );
          })}
        </ol>
      </nav>

      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            {title}
          </h1>
          {description ? (
            <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
              {description}
            </p>
          ) : null}
        </div>

        {actions ? (
          <div className="flex flex-wrap items-center gap-2">
            {actions}
          </div>
        ) : null}
      </div>
    </header>
  );
}

import Link from "next/link";
import { Card } from "@/components/ui/surface";
import { ReferralLink } from "./controls";
import type {
  AffiliateDashboard,
  AffiliateSummary,
} from "@/lib/affiliates/shared";
import type { AffiliateCopy } from "@/lib/affiliates/copy";
import { formatDate, type Locale } from "@/lib/i18n/config";

export function AffiliateStats({
  data,
  copy,
}: {
  data: AffiliateSummary;
  copy: AffiliateCopy;
}) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-callout text-fg-muted">
        {copy.signups}: <strong className="text-fg">{data.signups}</strong> ·{" "}
        {copy.sales}: <strong className="text-fg">{data.sales}</strong>
      </p>
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <p className="text-footnote text-fg-muted">{copy.pending}</p>
          <p className="text-large text-accent">{data.pending}</p>
        </Card>
        <Card>
          <p className="text-footnote text-fg-muted">{copy.paid}</p>
          <p className="text-large text-success">{data.paid}</p>
        </Card>
      </div>
    </div>
  );
}

export function Pagination({
  base,
  page,
  total,
  copy,
  param = "page",
  other = "",
}: {
  base: string;
  page: number;
  total: number;
  copy: AffiliateCopy;
  param?: string;
  other?: string;
}) {
  return (
    <nav className="flex justify-between gap-4 text-callout text-accent">
      {page > 0 ? (
        <Link href={`${base}?${param}=${page - 1}${other}`}>
          {copy.previous}
        </Link>
      ) : (
        <span />
      )}
      {(page + 1) * 25 < total ? (
        <Link href={`${base}?${param}=${page + 1}${other}`}>{copy.next}</Link>
      ) : null}
    </nav>
  );
}

export function AffiliateHistory({
  data,
  copy,
  locale,
  base,
  refPage,
  payPage,
  url,
}: {
  data: AffiliateDashboard;
  copy: AffiliateCopy;
  locale: Locale;
  base: string;
  refPage: number;
  payPage: number;
  url: string;
}) {
  const date = (value: string) =>
    formatDate(value, locale, {
      day: "2-digit",
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    });
  return (
    <div className="flex flex-col gap-6">
      <AffiliateStats data={data} copy={copy} />
      <Card>
        <ReferralLink url={url} copy={copy} />
      </Card>
      {!data.enabled ? (
        <p className="text-callout text-fg-muted">{copy.inactive}</p>
      ) : null}
      <p className="text-footnote text-fg-muted">{copy.rules}</p>
      <section className="flex flex-col gap-3">
        <h2 className="text-headline">{copy.referralHistory}</h2>
        <p className="text-footnote text-fg-muted">{copy.historyHint}</p>
        {data.referrals.length === 0 ? (
          <p className="text-fg-muted">{copy.noReferrals}</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-hairline">
            <table className="w-full text-left text-footnote">
              <thead className="bg-surface">
                <tr>
                  {[
                    copy.referral,
                    copy.joined,
                    copy.converted,
                    copy.status,
                  ].map((label) => (
                    <th className="p-3" key={label}>
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.referrals.map((r) => (
                  <tr key={r.id} className="border-t border-hairline">
                    <td className="p-3 font-mono">{r.id.slice(0, 8)}</td>
                    <td className="whitespace-nowrap p-3">
                      {date(r.created_at)}
                    </td>
                    <td className="whitespace-nowrap p-3">
                      {r.converted_at ? date(r.converted_at) : "—"}
                    </td>
                    <td className="p-3">
                      {r.paid
                        ? copy.paid
                        : r.converted_at
                          ? copy.pending
                          : copy.awaiting}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination
          base={base}
          page={refPage}
          total={data.signups}
          copy={copy}
          param="refPage"
          other={`&payPage=${payPage}`}
        />
      </section>
      <section className="flex flex-col gap-3">
        <h2 className="text-headline">{copy.payoutHistory}</h2>
        {data.payouts.length === 0 ? (
          <p className="text-fg-muted">{copy.noPayouts}</p>
        ) : (
          <ul className="divide-y divide-hairline rounded-xl border border-hairline bg-surface">
            {data.payouts.map((p) => (
              <li
                key={p.id}
                className="flex flex-wrap justify-between gap-2 p-4"
              >
                <div>
                  <p>{date(p.created_at)}</p>
                  <p className="text-caption text-fg-muted">
                    {copy.receipt}: {p.id.slice(0, 8)}
                  </p>
                </div>
                <p>
                  {copy.count}: <strong>{p.quantity}</strong>
                </p>
              </li>
            ))}
          </ul>
        )}
        <Pagination
          base={base}
          page={payPage}
          total={data.payoutCount}
          copy={copy}
          param="payPage"
          other={`&refPage=${refPage}`}
        />
      </section>
    </div>
  );
}

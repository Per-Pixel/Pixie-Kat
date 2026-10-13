import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

import PageWrapper from "../../components/common/PageWrapper";
import { publicMediaUrl, resolveMediaUrls, supabase } from "../../lib/supabase";
import { sanitizeRichText } from "../../utils/sanitizeRichText";

const formatEndDate = (iso) =>
  new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

const PromoDetailPage = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [promo, setPromo] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      const { data } = await supabase
        .from("promotional_items")
        .select("*")
        .eq("section", "promotions")
        .eq("slug", slug)
        .eq("is_active", true)
        .maybeSingle();

      if (!cancelled) {
        setPromo(data ? resolveMediaUrls(data) : null);
        setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const ctaLink = promo
    ? promo.link_url || (promo.game_id ? `/games/${promo.game_id}` : "/games")
    : "/games";

  return (
    <PageWrapper>
      <section className="bg-[#dfdff0] px-4 pb-24 md:px-10">
        <div className="mx-auto max-w-3xl">
          <Link
            to="/promotions"
            className="mb-6 inline-flex items-center gap-2 font-general text-sm font-semibold text-black/70 transition-colors hover:text-black"
          >
            <ArrowLeft className="size-4" />
            All promotions
          </Link>

          {loading ? (
            <div className="mt-16 flex justify-center">
              <div className="size-10 animate-spin rounded-full border-4 border-violet-300 border-t-transparent" />
            </div>
          ) : !promo ? (
            <div className="mt-10 rounded-2xl border-[3px] border-dashed border-black/20 bg-white/50 p-12 text-center">
              <p className="font-general text-lg font-semibold text-black">
                This promotion isn&apos;t available
              </p>
              <p className="mt-2 font-circular-web text-sm text-black/60">
                It may have ended or been hidden.
              </p>
              <button
                type="button"
                onClick={() => navigate("/promotions")}
                className="mt-6 rounded-full bg-black px-6 py-3 font-general text-xs font-bold uppercase tracking-wider text-white transition-transform hover:scale-105"
              >
                See current promos
              </button>
            </div>
          ) : (
            <article className="overflow-hidden rounded-3xl border-[3px] border-black bg-white">
              <div className="relative">
                <img
                  src={
                    promo.image_url ||
                    publicMediaUrl("/img/promotion/leomord.webp")
                  }
                  alt={promo.title}
                  className="h-56 w-full object-cover object-center sm:h-72 md:h-80"
                />
                {promo.discount_label && (
                  <span className="absolute right-0 top-0 rounded-bl-2xl bg-lime-300 px-5 py-2 font-general text-lg font-bold text-black">
                    {promo.discount_label}
                  </span>
                )}
              </div>

              <div className="space-y-5 p-6 text-black sm:p-8">
                <h1
                  className="text-3xl font-bold uppercase leading-[0.95] sm:text-4xl"
                  style={{ fontFamily: "zentry, sans-serif" }}
                >
                  {promo.title}
                </h1>

                {promo.ends_at && (
                  <p className="inline-block rounded-full bg-orange-100 px-4 py-1.5 font-general text-xs font-bold uppercase tracking-wide text-orange-600">
                    Ends {formatEndDate(promo.ends_at)}
                  </p>
                )}

                {promo.description && (
                  <p className="font-circular-web text-base leading-relaxed text-black/80 sm:text-lg">
                    {promo.description}
                  </p>
                )}

                {promo.details && (
                  <div
                    className="font-circular-web text-sm leading-relaxed text-black/80 sm:text-base [&_a]:text-violet-600 [&_a]:underline [&_h2]:mb-2 [&_h2]:mt-6 [&_h2]:font-general [&_h2]:text-lg [&_h2]:font-bold [&_h3]:mb-2 [&_h3]:mt-4 [&_h3]:font-general [&_h3]:font-bold [&_li]:ml-5 [&_ol_li]:list-decimal [&_p]:mb-3 [&_ul_li]:list-disc"
                    dangerouslySetInnerHTML={{
                      __html: sanitizeRichText(promo.details),
                    }}
                  />
                )}

                <button
                  type="button"
                  onClick={() => navigate(ctaLink)}
                  className="mt-2 rounded-full bg-yellow-300 px-8 py-3.5 font-general text-sm font-bold uppercase tracking-wider text-black transition-transform hover:scale-105"
                >
                  Top Up Now →
                </button>
              </div>
            </article>
          )}
        </div>
      </section>
    </PageWrapper>
  );
};

export default PromoDetailPage;

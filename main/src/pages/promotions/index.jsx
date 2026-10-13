import PageWrapper from "../../components/common/PageWrapper";
import AnimatedTitle from "../../components/common/AnimatedTitle";
import { publicMediaUrl } from "../../lib/supabase";
import { usePromoSection } from "../../hooks/usePromoSection";
import { PromotionCard } from "../home/sections/Promotion";

const PromotionsPage = () => {
  const { items, loading } = usePromoSection("promotions");

  const cards = items.map((item) => ({
    title: item.title,
    description: item.description ?? "",
    image: item.image_url || publicMediaUrl("/img/promotion/leomord.webp"),
    discount: item.discount_label ?? "",
    link: item.slug
      ? `/promotions/${item.slug}`
      : item.link_url ||
        (item.game_id ? `/games/${item.game_id}` : undefined),
  }));

  return (
    <PageWrapper>
      <section className="bg-[#dfdff0] px-4 pb-24 md:px-10">
        <div className="mx-auto max-w-7xl">
          <AnimatedTitle
            title="pr<b>o</b>moti<b>o</b>ns"
            textColor="#000000"
            containerClass="!mt-0 !items-start !gap-0 !px-0 !text-left !text-4xl !leading-[0.9] md:!text-6xl"
          />
          <p className="mt-4 max-w-md font-circular-web text-sm text-black/70 md:text-base">
            Every live deal, bonus and limited-time offer — tap a card for the
            full details.
          </p>

          {loading ? (
            <div className="mt-16 flex justify-center">
              <div className="size-10 animate-spin rounded-full border-4 border-violet-300 border-t-transparent" />
            </div>
          ) : cards.length === 0 ? (
            <div className="mt-16 rounded-2xl border-[3px] border-dashed border-black/20 bg-white/50 p-12 text-center">
              <p className="font-general text-lg font-semibold text-black">
                No promotions right now
              </p>
              <p className="mt-2 font-circular-web text-sm text-black/60">
                Check back soon — new offers drop regularly.
              </p>
            </div>
          ) : (
            <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {cards.map((card) => (
                <PromotionCard key={card.link || card.title} {...card} noStroke={false} />
              ))}
            </div>
          )}
        </div>
      </section>
    </PageWrapper>
  );
};

export default PromotionsPage;

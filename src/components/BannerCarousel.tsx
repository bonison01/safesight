
import { useState, useEffect } from 'react';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { Card, CardContent } from '@/components/ui/card';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

interface BannerSetting {
  id: string;
  title: string;
  subtitle: string;
  image_url: string;
  button_text: string;
  button_link: string;
  secondary_button_text: string;
  secondary_button_link: string;
  is_active: boolean;
  display_order: number;
  is_published: boolean;
}

const BannerCarousel = () => {
  const [api, setApi] = useState<any>();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [bannerSettings, setBannerSettings] = useState<BannerSetting[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBannerSettings();
  }, []);

  useEffect(() => {
    if (!api || bannerSettings.length <= 1) return;

    const timer = setInterval(() => {
      api.scrollNext();
    }, 5000);

    return () => clearInterval(timer);
  }, [api, bannerSettings.length]);

  useEffect(() => {
    if (!api) return;

    api.on('select', () => {
      setCurrentIndex(api.selectedScrollSnap());
    });
  }, [api]);

  const fetchBannerSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('banner_settings')
        .select('*')
        .eq('is_active', true)
        .eq('is_published', true)
        .order('display_order', { ascending: true });

      if (error) {
        console.error('Error fetching banner settings:', error);
        setBannerSettings([{
          id: 'fallback',
          title: 'Authentic Flavors',
          subtitle: 'Traditional Recipes',
          image_url: 'https://images.unsplash.com/photo-1500673922987-e212871fec22?w=1920&h=600&fit=crop',
          button_text: 'Shop Now',
          button_link: '/shop',
          secondary_button_text: 'Our Story',
          secondary_button_link: '/about',
          is_active: true,
          display_order: 1,
          is_published: true,
        }]);
      } else {
        setBannerSettings(data.length > 0 ? data : [{
          id: 'fallback',
          title: 'Authentic Flavors',
          subtitle: 'Traditional Recipes',
          image_url: 'https://images.unsplash.com/photo-1500673922987-e212871fec22?w=1920&h=600&fit=crop',
          button_text: 'Shop Now',
          button_link: '/shop',
          secondary_button_text: 'Our Story',
          secondary_button_link: '/about',
          is_active: true,
          display_order: 1,
          is_published: true,
        }]);
      }
    } catch (error) {
      console.error('Error fetching banner settings:', error);
      setBannerSettings([{
        id: 'fallback',
        title: 'Authentic Flavors',
        subtitle: 'Traditional Recipes',
        image_url: 'https://images.unsplash.com/photo-1500673922987-e212871fec22?w=1920&h=600&fit=crop',
        button_text: 'Shop Now',
        button_link: '/shop',
        secondary_button_text: 'Our Story',
        secondary_button_link: '/about',
        is_active: true,
        display_order: 1,
        is_published: true,
      }]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full h-[300px] md:h-[350px] bg-gray-200 animate-pulse flex items-center justify-center">
        <div className="text-gray-500">Loading banners...</div>
      </div>
    );
  }

  if (bannerSettings.length === 0) {
    return null;
  }

  return (
    <div className="w-full">
      <Carousel 
        className="w-full"
        setApi={setApi}
        opts={{
          align: "start",
          loop: bannerSettings.length > 1,
        }}
      >
        <CarouselContent>
          {bannerSettings.map((banner) => (
            <CarouselItem key={banner.id}>
              <Card className="border-0 shadow-none overflow-hidden">
                <CardContent className="p-0 relative">
                  <div className="relative h-[300px] md:h-[350px]">
                    <img
                      src={banner.image_url}
                      alt={banner.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black bg-opacity-60" />
                    <div className="absolute inset-0 flex items-center justify-center text-center text-white">
                      <div className="space-y-6 max-w-4xl mx-auto px-4">
                        <h1 className="text-4xl md:text-6xl font-bold">
                          {banner.title}
                        </h1>
                        <h4 className="text-10xl md:text-4xl font-light text-gray-300">
                          {banner.subtitle}
                        </h4>
                        <div className="space-x-4 pt-4">
                          <Link
                            to={banner.button_link}
                            className="bg-white text-black px-8 py-3 rounded-lg font-semibold hover:bg-gray-200 transition-colors inline-block"
                          >
                            {banner.button_text}
                          </Link>
                          <Link
                            to={banner.secondary_button_link}
                            className="border-2 border-white text-white px-8 py-3 rounded-lg font-semibold hover:bg-white hover:text-black transition-colors inline-block"
                          >
                            {banner.secondary_button_text}
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </CarouselItem>
          ))}
        </CarouselContent>
        {bannerSettings.length > 1 && (
          <>
            <CarouselPrevious className="left-8 bg-white/20 border-white/30 text-white hover:bg-white/30" />
            <CarouselNext className="right-8 bg-white/20 border-white/30 text-white hover:bg-white/30" />
          </>
        )}
      </Carousel>
      
      {bannerSettings.length > 1 && (
        <div className="flex justify-center mt-4 space-x-2">
          {bannerSettings.map((_, index) => (
            <button
              key={index}
              className={`w-3 h-3 rounded-full transition-colors ${
                index === currentIndex ? 'bg-gray-800' : 'bg-gray-400'
              }`}
              onClick={() => api?.scrollTo(index)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default BannerCarousel;

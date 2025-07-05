import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import PageWrapper from '@/components/PageWrapper';

const AboutUs = () => {
  return (
    <PageWrapper>
      {/* Hero Section */}
      <section className="relative w-full h-[60vh] md:h-[70vh] overflow-hidden bg-[#10061E]">
        <div className="absolute inset-0 bg-gradient-to-b from-[#10061E]/90 to-[#10061E]/70 z-10"></div>
        <div className="absolute inset-0 bg-[url('/img/hero/about-bg.jpg')] bg-cover bg-center opacity-30"></div>

        <div className="relative z-20 container mx-auto px-4 h-full flex flex-col justify-center items-center text-center">
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-4 text-white">
            We're Building <span className="text-gradient-shine">The Future</span> of Gaming
          </h1>
          <p className="text-lg md:text-xl text-gray-300 max-w-3xl mx-auto">
            PixieKat is revolutionizing the gaming experience through innovative products,
            exceptional service, and a passionate community.
          </p>
        </div>
      </section>

      {/* Our Mission Section */}
      <section className="py-20 bg-[#10061E]">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center gap-12">
            <div className="w-full md:w-1/2">
              <h2 className="text-3xl md:text-4xl font-bold mb-6 text-white">Our Mission</h2>
              <p className="text-gray-300 mb-6">
                At PixieKat, we're on a mission to transform how gamers experience their favorite titles.
                We believe gaming is more than just entertainment—it's a lifestyle, a community, and a
                platform for innovation.
              </p>
              <p className="text-gray-300 mb-6">
                Our goal is to provide gamers with premium products and services that enhance their
                gaming experience, connect them with like-minded individuals, and help them reach
                their full potential in the digital realm.
              </p>
              <div className="flex flex-wrap gap-4 mt-8">
                <div className="bg-gray-800/50 p-6 rounded-lg flex-1 min-w-[200px]">
                  <h3 className="text-xl font-bold text-white mb-2">Innovation</h3>
                  <p className="text-gray-400">Pushing boundaries in gaming products and services</p>
                </div>
                <div className="bg-gray-800/50 p-6 rounded-lg flex-1 min-w-[200px]">
                  <h3 className="text-xl font-bold text-white mb-2">Community</h3>
                  <p className="text-gray-400">Building connections between passionate gamers</p>
                </div>
              </div>
            </div>
            <div className="w-full md:w-1/2 relative h-[400px] rounded-lg overflow-hidden">
              <Image
                src="/img/hero/mission-image.jpg"
                alt="Our Mission"
                fill
                className="object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Our Story Section */}
      <section className="py-20 bg-[#0c0416]">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold mb-6 text-white">Our Story</h2>
            <p className="text-gray-300 max-w-3xl mx-auto">
              The journey of PixieKat began with a simple idea: to create a platform where gamers could find
              everything they need to elevate their gaming experience.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-[#10061E] p-8 rounded-lg transform transition-all duration-300 hover:scale-105">
              <div className="text-4xl font-bold text-[#fa4454] mb-4">01</div>
              <h3 className="text-xl font-bold text-white mb-4">The Beginning</h3>
              <p className="text-gray-400">
                Founded by a group of passionate gamers who saw a gap in the market for high-quality gaming products
                and services that truly understood the needs of the gaming community.
              </p>
            </div>
            <div className="bg-[#10061E] p-8 rounded-lg transform transition-all duration-300 hover:scale-105">
              <div className="text-4xl font-bold text-[#fa4454] mb-4">02</div>
              <h3 className="text-xl font-bold text-white mb-4">Growth & Evolution</h3>
              <p className="text-gray-400">
                From a small online store to a comprehensive gaming platform, we've expanded our offerings
                while staying true to our core mission of enhancing the gaming experience.
              </p>
            </div>
            <div className="bg-[#10061E] p-8 rounded-lg transform transition-all duration-300 hover:scale-105">
              <div className="text-4xl font-bold text-[#fa4454] mb-4">03</div>
              <h3 className="text-xl font-bold text-white mb-4">Today & Beyond</h3>
              <p className="text-gray-400">
                Now serving gamers worldwide, we continue to innovate and expand our ecosystem,
                creating new ways for gamers to connect, compete, and enjoy their favorite titles.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className="py-20 bg-[#10061E]">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold mb-6 text-white">Meet Our Team</h2>
            <p className="text-gray-300 max-w-3xl mx-auto">
              The passionate individuals behind PixieKat who work tirelessly to bring you the best gaming experience.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Team Member 1 */}
            <div className="bg-[#0c0416] rounded-lg overflow-hidden transform transition-all duration-300 hover:scale-105">
              <div className="relative h-[300px]">
                <Image
                  src="/img/team/team1.jpg"
                  alt="Team Member"
                  fill
                  className="object-cover"
                />
              </div>
              <div className="p-6">
                <h3 className="text-xl font-bold text-white mb-1">Alex Johnson</h3>
                <p className="text-[#fa4454] mb-4">Founder & CEO</p>
                <p className="text-gray-400">
                  Passionate gamer with over 15 years of experience in the gaming industry.
                </p>
              </div>
            </div>

            {/* Team Member 2 */}
            <div className="bg-[#0c0416] rounded-lg overflow-hidden transform transition-all duration-300 hover:scale-105">
              <div className="relative h-[300px]">
                <Image
                  src="/img/team/team2.jpg"
                  alt="Team Member"
                  fill
                  className="object-cover"
                />
              </div>
              <div className="p-6">
                <h3 className="text-xl font-bold text-white mb-1">Sarah Chen</h3>
                <p className="text-[#fa4454] mb-4">Chief Product Officer</p>
                <p className="text-gray-400">
                  Former pro gamer turned product strategist with a keen eye for user experience.
                </p>
              </div>
            </div>

            {/* Team Member 3 */}
            <div className="bg-[#0c0416] rounded-lg overflow-hidden transform transition-all duration-300 hover:scale-105">
              <div className="relative h-[300px]">
                <Image
                  src="/img/team/team3.jpg"
                  alt="Team Member"
                  fill
                  className="object-cover"
                />
              </div>
              <div className="p-6">
                <h3 className="text-xl font-bold text-white mb-1">Marcus Lee</h3>
                <p className="text-[#fa4454] mb-4">Head of Technology</p>
                <p className="text-gray-400">
                  Tech wizard who ensures our platform runs smoothly and securely for all users.
                </p>
              </div>
            </div>

            {/* Team Member 4 */}
            <div className="bg-[#0c0416] rounded-lg overflow-hidden transform transition-all duration-300 hover:scale-105">
              <div className="relative h-[300px]">
                <Image
                  src="/img/team/team4.jpg"
                  alt="Team Member"
                  fill
                  className="object-cover"
                />
              </div>
              <div className="p-6">
                <h3 className="text-xl font-bold text-white mb-1">Emma Rodriguez</h3>
                <p className="text-[#fa4454] mb-4">Community Manager</p>
                <p className="text-gray-400">
                  The heart of our community, ensuring gamers feel connected and heard.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Partners Section */}
      <section className="py-20 bg-[#0c0416]">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold mb-6 text-white">Our Partners</h2>
            <p className="text-gray-300 max-w-3xl mx-auto">
              We collaborate with industry leaders to bring you the best gaming products and experiences.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="bg-[#10061E] p-8 rounded-lg flex items-center justify-center h-[120px]">
              <Image
                src="/img/partners/partner1.svg"
                alt="Partner Logo"
                width={120}
                height={60}
                className="opacity-70 hover:opacity-100 transition-opacity duration-300"
              />
            </div>
            <div className="bg-[#10061E] p-8 rounded-lg flex items-center justify-center h-[120px]">
              <Image
                src="/img/partners/partner2.svg"
                alt="Partner Logo"
                width={120}
                height={60}
                className="opacity-70 hover:opacity-100 transition-opacity duration-300"
              />
            </div>
            <div className="bg-[#10061E] p-8 rounded-lg flex items-center justify-center h-[120px]">
              <Image
                src="/img/partners/partner3.svg"
                alt="Partner Logo"
                width={120}
                height={60}
                className="opacity-70 hover:opacity-100 transition-opacity duration-300"
              />
            </div>
            <div className="bg-[#10061E] p-8 rounded-lg flex items-center justify-center h-[120px]">
              <Image
                src="/img/partners/partner4.svg"
                alt="Partner Logo"
                width={120}
                height={60}
                className="opacity-70 hover:opacity-100 transition-opacity duration-300"
              />
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-[#10061E] relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('/img/hero/cta-bg.jpg')] bg-cover bg-center opacity-20"></div>
        <div className="absolute inset-0 bg-gradient-to-b from-[#10061E]/90 to-[#10061E]/70"></div>

        <div className="relative z-10 container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-5xl font-bold mb-6 text-white">
            Join Our Gaming Community
          </h2>
          <p className="text-gray-300 max-w-3xl mx-auto mb-8">
            Be part of a growing community of passionate gamers. Get exclusive access to new products,
            special events, and connect with like-minded individuals.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/sign-up" className="valorant-btn">
              <span>Join Now</span>
            </Link>
            <Link href="/contact-us" className="btn btn-outline text-white border-white hover:bg-white hover:text-[#10061E]">
              Contact Us
            </Link>
          </div>
        </div>
      </section>
    </PageWrapper>
  );
};

export default AboutUs;

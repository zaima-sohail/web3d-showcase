import Image from "next/image";
import Link from "next/link";

export default function HomePage() {
  return (
    <main className="bg-gray-950 text-white">

      {/* Navbar */}
      <nav className="flex justify-between items-center p-6 bg-black">
        <h1 className="text-3xl font-bold text-blue-500">
          Web3D Showcase
        </h1>

        <Link
          href="/login"
          className="bg-blue-600 px-5 py-2 rounded-lg"
        >
          Admin Login
        </Link>
      </nav>

      {/* Hero */}
      <section className="grid md:grid-cols-2 gap-10 items-center px-10 py-20">

        <div>

          <h1 className="text-6xl font-bold leading-tight">
            Explore Amazing
            <span className="text-blue-500">
              {" "}3D Models
            </span>
          </h1>

          <p className="text-gray-300 mt-6 text-lg">
            Upload, Manage and Showcase high-quality
            interactive 3D assets with a beautiful
            admin dashboard.
          </p>

          <div className="flex gap-4 mt-8">

            <Link
              href="/showcase"
              className="bg-blue-600 px-6 py-3 rounded-lg"
            >
              Explore
            </Link>

            <Link
              href="/login"
              className="border border-white px-6 py-3 rounded-lg"
            >
              Login
            </Link>

          </div>

        </div>

        <Image
          src="/image/hero.jpg"
          alt="Hero"
          width={700}
          height={500}
          className="rounded-2xl shadow-xl"
        />

      </section>

      {/* Featured Models */}

      <section className="px-10 py-20">

        <h2 className="text-4xl font-bold mb-10">
          Featured Models
        </h2>

        <div className="grid md:grid-cols-3 gap-8">

          <div className="bg-gray-900 rounded-xl overflow-hidden">

            <Image
              src="/image/chair.jpg"
              alt="Chair"
              width={500}
              height={300}
            />

            <div className="p-5">

              <h3 className="text-2xl font-semibold">
                Modern Chair
              </h3>

              <p className="text-gray-400 mt-2">
                Interactive 3D furniture model.
              </p>

            </div>

          </div>

          <div className="bg-gray-900 rounded-xl overflow-hidden">

            <Image
              src="/image/laptop.jpg"
              alt="Laptop"
              width={500}
              height={300}
            />

            <div className="p-5">

              <h3 className="text-2xl font-semibold">
                Gaming Laptop
              </h3>

              <p className="text-gray-400 mt-2">
                High-quality 3D electronic asset.
              </p>

            </div>

          </div>

          <div className="bg-gray-900 rounded-xl overflow-hidden">

            <Image
              src="/image/room.jpg"
              alt="Room"
              width={500}
              height={300}
            />

            <div className="p-5">

              <h3 className="text-2xl font-semibold">
                Living Room
              </h3>

              <p className="text-gray-400 mt-2">
                Complete interior visualization.
              </p>

            </div>

          </div>

        </div>

      </section>

      {/* Why Choose Us */}

      <section className="bg-black py-20">

        <h2 className="text-center text-4xl font-bold">
          Why Choose Web3D Showcase?
        </h2>

        <div className="grid md:grid-cols-3 gap-8 px-10 mt-12">

          <div className="bg-gray-900 rounded-xl p-8">
            <h3 className="text-2xl font-bold">
              Fast Uploads
            </h3>

            <p className="mt-4 text-gray-400">
              Upload Images and GLB Models in seconds.
            </p>
          </div>

          <div className="bg-gray-900 rounded-xl p-8">
            <h3 className="text-2xl font-bold">
              Secure Admin
            </h3>

            <p className="mt-4 text-gray-400">
              JWT Authentication with Role Based Access.
            </p>
          </div>

          <div className="bg-gray-900 rounded-xl p-8">
            <h3 className="text-2xl font-bold">
              Interactive 3D
            </h3>

            <p className="mt-4 text-gray-400">
              Explore models using Three.js & React Three Fiber.
            </p>
          </div>

        </div>

      </section>

      {/* Footer */}

      <footer className="bg-gray-950 text-center py-8 text-gray-500">
        © 2026 Web3D Showcase | Built with Next.js & MongoDB
      </footer>

    </main>
  );
}
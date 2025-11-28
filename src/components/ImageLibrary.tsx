"use client";

import Sidebar from "@/components/sidebar";
import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { api } from "@/lib/api";

interface Product {
  id: number;
  name: string;
  price: number;
  images?: string[]; // filenames
}

export default function ImageLibraryPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [images, setImages] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Fetch products and extract image URLs
  useEffect(() => {
    async function loadProducts() {
      try {
        const data: Product[] = await api("/products");
        setProducts(data);

        // Map filenames to API endpoint URLs
       const allImages = data.flatMap((p) =>
        (p.images || []).map((filename) => `http://localhost:4000/uploads/${encodeURIComponent(filename)}`)
        );


        setImages(allImages);
      } catch (err) {
        console.error(err);
      }
    }
    loadProducts();
  }, []);

  const prevImage = () =>
    setCurrentIndex((i) => (i === 0 ? images.length - 1 : i - 1));
  const nextImage = () =>
    setCurrentIndex((i) => (i === images.length - 1 ? 0 : i + 1));

  if (!images || images.length === 0) {
    return (
      <div className="flex min-h-screen bg-zinc-100 dark:bg-black">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center text-zinc-500 dark:text-zinc-400">
          <p>No images available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-zinc-100 dark:bg-black">
      <Sidebar />
      <main className="flex-1 flex flex-col items-center justify-center p-10">
        {/* Main Image */}
        <div className="relative w-full max-w-3xl h-96 bg-zinc-200 dark:bg-zinc-900 rounded-xl overflow-hidden shadow-lg flex items-center justify-center">
          <img
            src={images[currentIndex]}
            alt={`Image ${currentIndex + 1}`}
            className="object-contain w-full h-full"
          />
          <button
            onClick={prevImage}
            className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-black/30 rounded-full hover:bg-black/50"
          >
            <ChevronLeft className="w-6 h-6 text-white" />
          </button>
          <button
            onClick={nextImage}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-black/30 rounded-full hover:bg-black/50"
          >
            <ChevronRight className="w-6 h-6 text-white" />
          </button>
        </div>

        {/* Thumbnails */}
        <div className="mt-4 flex gap-2 overflow-x-auto py-2">
          {images.map((url, idx) => (
            <img
              key={idx}
              src={url}
              alt={`Thumbnail ${idx + 1}`}
              className={`h-24 w-24 object-cover rounded cursor-pointer border-2 ${
                idx === currentIndex ? "border-blue-500" : "border-transparent"
              }`}
              onClick={() => setCurrentIndex(idx)}
            />
          ))}
        </div>
      </main>
    </div>
  );
}

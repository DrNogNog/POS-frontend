"use client";

import styles from "@/styles/imagelibrary.module.css";
import Sidebar from "@/components/sidebar";
import { useState, useEffect, useRef } from "react";
import { api } from "@/lib/api";

interface Product {
  id: number;
  name: string;
  description?: string;
  images?: string[];
}

interface ImageItem {
  src: string;
  name: string;
  description?: string;
  filename: string;
}

export default function ImageLibraryPage() {
  const [images, setImages] = useState<ImageItem[]>([]);
  const [filteredImages, setFilteredImages] = useState<ImageItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [popupImage, setPopupImage] = useState<ImageItem | null>(null);
  const [updatingImage, setUpdatingImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load images from products
  useEffect(() => {
    async function loadProducts() {
      try {
        const res = await api("/products");

        // 🔒 SAFELY extract products no matter the API shape
        const products: Product[] =
          Array.isArray(res)
            ? res
            : Array.isArray(res?.data)
            ? res.data
            : Array.isArray(res?.data?.products)
            ? res.data.products
            : [];

        const allImages: ImageItem[] = products.flatMap((p) =>
          (p.images ?? []).map((filename) => ({
            src: `http://localhost:4000/uploads/${encodeURIComponent(filename)}`,
            name: p.name,
            description: p.description,
            filename,
          }))
        );

        setImages(allImages);
        setFilteredImages(allImages);
      } catch (err) {
        console.error("Failed to load products:", err);
        setImages([]);
        setFilteredImages([]);
      }
    }

    loadProducts();
  }, []);

  // Search filter
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredImages(images);
      return;
    }

    const query = searchQuery.toLowerCase();
    setFilteredImages(
      images.filter(
        (img) =>
          img.name.toLowerCase().includes(query) ||
          img.description?.toLowerCase().includes(query) ||
          img.filename.toLowerCase().includes(query)
      )
    );
  }, [searchQuery, images]);

  // Handle image update
  const handleImageUpdate = async (oldFilename: string, newFile: File) => {
    if (!newFile.type.startsWith("image/")) {
      alert("Please select an image file");
      return;
    }

    setUpdatingImage(oldFilename);

    const formData = new FormData();
    formData.append("newImage", newFile);
    formData.append("oldFilename", oldFilename);

    try {
      const res = await fetch("http://localhost:4000/api/products/updateImage", {
        method: "PATCH",
        body: formData,
        credentials: "include",
        mode: "cors",
      });

      if (!res.ok) throw new Error(`Server error: ${res.status}`);

      const data = await res.json();
      const newFilename = data.src.split("/").pop()!;
      const newSrc = `http://localhost:4000/uploads/${encodeURIComponent(
        newFilename
      )}`;

      setImages((prev) =>
        prev.map((img) =>
          img.filename === oldFilename
            ? { ...img, src: newSrc, filename: newFilename }
            : img
        )
      );

      if (popupImage?.filename === oldFilename) {
        setPopupImage({ ...popupImage, src: newSrc });
      }

      alert("Image replaced successfully!");
    } catch (err) {
      console.error("Upload failed:", err);
      alert("Failed to update image. Are you logged in?");
    } finally {
      setUpdatingImage(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const triggerFileInput = (filename: string) => {
    if (fileInputRef.current) {
      fileInputRef.current.dataset.target = filename;
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const targetFilename = e.target.dataset.target;
    if (file && targetFilename) {
      handleImageUpdate(targetFilename, file);
    }
  };

  // Close popup on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (
        popupImage &&
        !target.closest(`.${styles.hellox}`) &&
        !target.closest(`#${styles.PopDiv}`) &&
        !target.closest("button") &&
        !target.closest("input")
      ) {
        setPopupImage(null);
      }
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [popupImage]);

  return (
    <div className={styles.wrapper}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        style={{ display: "none" }}
        data-target=""
      />

      <div className="flex min-h-screen bg-zinc-100 dark:bg-black">
        <Sidebar />

        <main className="flex-1 p-10">
          {/* Search bar + gallery unchanged */}
          {/* POPUP unchanged */}
        </main>
      </div>
    </div>
  );
}

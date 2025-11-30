"use client";

import { useState, useEffect } from "react";
import Sidebar from "@/components/sidebar";
import { api } from "@/lib/api";

interface Archive {
  id: number;
  entity: string;
  entityId: number;
  data: any; // JSON data of the archived record
  createdAt: string;
}

export default function ArchivesPage() {
  const [archives, setArchives] = useState<Archive[]>([]);

  useEffect(() => {
    async function loadArchives() {
      try {
        const data: Archive[] = await api("/archives"); // make sure your backend route exists
        setArchives(data);
      } catch (err) {
        console.error(err);
      }
    }

    loadArchives();
  }, []);

  return (
    <div className="flex min-h-screen bg-zinc-100 dark:bg-black">
      <Sidebar />
      <main className="flex-1 p-10">
        <h1 className="text-3xl font-bold mb-6">Archives</h1>

        <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-xl border overflow-x-auto">
          <table className="w-full">
            <thead className="bg-zinc-50 dark:bg-zinc-800 border-b sticky top-0 z-10">
              <tr>
                <th className="px-6 py-4 text-left">ID</th>
                <th className="px-6 py-4 text-left">Entity</th>
                <th className="px-6 py-4 text-left">Entity ID</th>
                <th className="px-6 py-4 text-left">Data</th>
                <th className="px-6 py-4 text-left">Archived At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-700">
              {archives.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-zinc-500 dark:text-zinc-400">
                    No archived records found.
                  </td>
                </tr>
              ) : (
                archives.map((archive) => (
                  <tr key={archive.id}>
                    <td className="px-6 py-4">{archive.id}</td>
                    <td className="px-6 py-4">{archive.entity}</td>
                    <td className="px-6 py-4">{archive.entityId}</td>
                    <td className="px-6 py-4">
                      <pre className="text-xs max-w-xs overflow-x-auto">{JSON.stringify(archive.data, null, 2)}</pre>
                    </td>
                    <td className="px-6 py-4">{new Date(archive.createdAt).toLocaleString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}

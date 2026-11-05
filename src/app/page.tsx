import { Suspense } from "react";
import { connection } from "next/server";
import { getJokes } from "@/lib/jokes";
import styles from "./page.module.css";

export default function Home() {
  return (
    <main className={styles.main}>
      <header className={styles.header}>
        <p className={styles.eyebrow}>The Humor Project / Week 03</p>
        <h1>A little collection<br />of laughs.</h1>
        <p className={styles.intro}>
          Small jokes. Big groans. Find your next favorite below.
        </p>
      </header>
      <section aria-label="Joke collection">
        <Suspense fallback={<p className={styles.notice} role="status">Loading the collection…</p>}>
          <JokeList />
        </Suspense>
      </section>
      <footer className={styles.footer}>A small beginning. A world of possibilities.</footer>
    </main>
  );
}

async function JokeList() {
  // Fetch at request time, including when the app uses Cache Components.
  await connection();
  const result = await getJokes();

  if (result.status !== "success") {
    return <p className={styles.notice} role="status">{result.message}</p>;
  }

  if (result.jokes.length === 0) {
    return <p className={styles.notice}>No jokes yet. The first laugh is on its way.</p>;
  }

  return (
    <>
      <div className={styles.collectionHeading}>
        <h2>The collection</h2>
        <span>{result.jokes.length} {result.jokes.length === 1 ? "joke" : "jokes"} · From Supabase</span>
      </div>
      <ul className={styles.grid}>
        {result.jokes.map((joke) => (
          <li className={styles.card} key={joke.id}>
            <span className={styles.category}>{joke.category}</span>
            <h3>{joke.setup}</h3>
            <p>{joke.punchline}</p>
          </li>
        ))}
      </ul>
    </>
  );
}

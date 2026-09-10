'use client'
export default function ErrorPage({reset}:{reset:()=>void}) {
 return <section className="narrow-page"><h1>We couldn’t load this page.</h1><p className="lede">Your connection or the civic service may be unavailable. Please try again.</p><button className="primary-button" onClick={reset}>Try again</button></section>
}

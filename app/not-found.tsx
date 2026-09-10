import Link from 'next/link'
export default function NotFound(){return <section className="narrow-page"><h1>This record isn’t available.</h1><p className="lede">It may be private, or the link may be incorrect. Sign in to view your own reports.</p><Link className="primary-button" href="/sign-in">Sign in</Link></section>}

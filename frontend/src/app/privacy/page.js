'use client';

export default function PrivacyPage() {
  return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'var(--surface)',padding:20}}>
      <div style={{background:'var(--bg)',borderRadius:12,padding:32,width:'100%',maxWidth:700,boxShadow:'0 8px 24px rgba(0,0,0,0.3)',border:'1px solid var(--border)'}}>
        <h1 style={{fontSize:24,marginBottom:24}}>Ochrana osobnich udaju</h1>
        <div style={{fontSize:14,lineHeight:1.7,color:'var(--text-muted)'}}>
          <h2 style={{fontSize:18,color:'var(--text)',marginBottom:8}}>1. Spravce udaju</h2>
          <p style={{marginBottom:16}}>Spravcem vaseho osobnich udaju je provozovatel aplikace Wheelca.</p>
          <h2 style={{fontSize:18,color:'var(--text)',marginBottom:8}}>2. Jaké udaje zpracovavame</h2>
          <p style={{marginBottom:16}}>Email, zobrazované jméno, typ voziku, preferovany max. sklon. Údaje slouží k personalizaci tras a přihlášení.</p>
          <h2 style={{fontSize:18,color:'var(--text)',marginBottom:8}}>3. Pravni zaklad</h2>
          <p style={{marginBottom:16}}>Zpracování probíhá na základě vašeho souhlasu (cl. 6 odst. 1 pism. a) GDPR) a plneni smlouvy (cl. 6 odst. 1 pism. b) GDPR).</p>
          <h2 style={{fontSize:18,color:'var(--text)',marginBottom:8}}>4. Doba uchovani</h2>
          <p style={{marginBottom:16}}>Udaje uchavame po dobu existence uctu. Po smazani uctu jsou vsechny udaje trvale odstraneny.</p>
          <h2 style={{fontSize:18,color:'var(--text)',marginBottom:8}}>5. Vase prava</h2>
          <p style={{marginBottom:16}}>Mate pravo na pristup, opravu, vymazani, prenositelnost a omezeni zpracovani. Vsechna prava muzete uplatnit v nastaveni profilu nebo kontaktovanim spravce.</p>
          <h2 style={{fontSize:18,color:'var(--text)',marginBottom:8}}>6. Export a smazani</h2>
          <p style={{marginBottom:16}}>V profilu můžete exportovat všechna svá data ve formatu JSON nebo smazat účet včetně všech údajů.</p>
        </div>
        <div style={{marginTop:24,textAlign:'center'}}><a href="/" style={{color:'var(--text-muted)',fontSize:13}}>Zpět na mapu</a></div>
      </div>
    </div>
  );
}

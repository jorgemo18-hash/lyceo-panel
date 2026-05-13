// Documentos.jsx — dos hojas imprimibles para entregar a familias nuevas:
//   1) Hoja de inscripción + cláusula RGPD
//   2) Normas de la academia (curso 24/25)
// Botón "Imprimir todo" abre el diálogo del navegador con ambos documentos.

// ───────────── Inscripción ─────────────
function HojaInscripcion() {
  return (
    <article className="doc-sheet doc-sheet--inscripcion">
      <header className="doc-head">
        <img src="logo.png" alt="" className="doc-head__logo" />
        <div className="doc-head__txt">
          <div className="doc-head__brand">Lyceo</div>
          <div className="doc-head__sub">Academia de estudios · Huesca</div>
        </div>
      </header>

      <h1 className="doc-h1">Hoja de inscripción</h1>

      <section className="doc-form">
        <div className="doc-row">
          <label className="doc-field doc-field--lg">
            <span className="doc-lbl">Nombre del alumn@</span>
            <span className="doc-line" />
          </label>
          <label className="doc-field doc-field--sm">
            <span className="doc-lbl">Curso</span>
            <span className="doc-line" />
          </label>
        </div>

        <label className="doc-field">
          <span className="doc-lbl">Nombre del padre, madre o tutor</span>
          <span className="doc-line" />
        </label>

        <label className="doc-field">
          <span className="doc-lbl">Apellidos</span>
          <span className="doc-line" />
        </label>

        <div className="doc-row">
          <label className="doc-field doc-field--sm">
            <span className="doc-lbl">DNI</span>
            <span className="doc-line" />
          </label>
          <label className="doc-field doc-field--lg">
            <span className="doc-lbl">Dirección</span>
            <span className="doc-line" />
          </label>
        </div>

        <div className="doc-row">
          <label className="doc-field doc-field--sm">
            <span className="doc-lbl">Código postal</span>
            <span className="doc-line" />
          </label>
          <label className="doc-field doc-field--lg">
            <span className="doc-lbl">Teléfono de contacto</span>
            <span className="doc-line" />
          </label>
        </div>

        <label className="doc-field">
          <span className="doc-lbl">Email</span>
          <span className="doc-line" />
        </label>
      </section>

      <section className="doc-pago">
        <h2 className="doc-h2">Método de pago</h2>
        <div className="doc-pago__opts">
          <label className="doc-opt">
            <span className="doc-check" />
            <span className="doc-opt__lbl">Domiciliado · IBAN</span>
            <span className="doc-line doc-line--grow" />
          </label>
          <label className="doc-opt">
            <span className="doc-check" />
            <span className="doc-opt__lbl">Transferencia bancaria a:</span>
            <span className="doc-opt__val">ES04 0182 3107 1202 0166 6835</span>
          </label>
          <label className="doc-opt">
            <span className="doc-check" />
            <span className="doc-opt__lbl">Bizum</span>
            <span className="doc-opt__val">675 32 41 28</span>
          </label>
          <label className="doc-opt">
            <span className="doc-check" />
            <span className="doc-opt__lbl">En efectivo</span>
          </label>
        </div>
      </section>

      <section className="doc-pago">
        <h2 className="doc-h2">Preferencia de cobro</h2>
        <div className="doc-pago__opts">
          <label className="doc-opt">
            <span className="doc-check" />
            <span className="doc-opt__lbl">Principio de mes</span>
          </label>
          <label className="doc-opt">
            <span className="doc-check" />
            <span className="doc-opt__lbl">Final de mes</span>
          </label>
        </div>
      </section>

      <section className="doc-firma">
        <p className="doc-firma__lugar">
          En <span className="doc-line doc-line--inline doc-line--mid" />,
          a <span className="doc-line doc-line--inline doc-line--xs" />
          de <span className="doc-line doc-line--inline doc-line--sm" />
          de <span className="doc-line doc-line--inline doc-line--xs" />.
        </p>
        <div className="doc-firma__bloque">
          <div className="doc-firma__col">
            <div className="doc-firma__lbl">Don/Doña</div>
            <span className="doc-line" />
          </div>
          <div className="doc-firma__col doc-firma__col--right">
            <div className="doc-firma__lbl">Firmado</div>
            <div className="doc-firma__caja" />
          </div>
        </div>
      </section>

      <ClausulaRGPD />
    </article>
  );
}

function ClausulaRGPD() {
  return (
    <section className="doc-rgpd">
      <h3 className="doc-rgpd__h">Información sobre protección de datos</h3>
      <p className="doc-rgpd__intro">
        De acuerdo con lo dispuesto en el Reglamento General de Protección de Datos (UE) 2016/679
        (en adelante, RGPD), le informamos que:
      </p>
      <p className="doc-rgpd__resp">
        <strong>Responsable:</strong> JORGE MORENO PARDO · NIF/CIF 18042793Y ·
        Dir. postal: C/ Jazmín 1 bajos, 22002 Huesca ·
        Teléfono: 675 32 41 28 · Correo: info@lyceoacademia.com
      </p>
      <p>
        En nombre de la empresa tratamos la información que nos facilita con el fin de prestarles
        el servicio solicitado, realizar las gestiones administrativas del mismo o mandarle
        información sobre nuestros productos o servicios. Los datos proporcionados se conservarán
        mientras se mantenga la relación comercial o durante los años necesarios para cumplir con
        las obligaciones legales. Sus datos no se cederán a terceros salvo en los casos en que
        exista una obligación legal o la propia prestación de servicio lo justifique. Podrá
        obtener confirmación sobre si en JORGE MORENO PARDO estamos tratando sus datos, por tanto,
        tiene derecho a acceder a sus datos personales, rectificar los datos inexactos o solicitar
        su supresión de los mismos.
      </p>

      <h4 className="doc-rgpd__sub">¿Con qué finalidad tratamos sus datos personales?</h4>
      <p>
        En JORGE MORENO PARDO tratamos la información que nos facilitan las personas interesadas
        con el fin de gestionar el envío de la información que nos soliciten.
      </p>
      <p>
        Con el fin de poder ofrecerle productos y servicios de acuerdo con sus intereses y mejorar
        su experiencia de usuario, elaboraremos un “perfil comercial”, en base a la información
        facilitada. No se tomarán decisiones automatizadas en base a dicho perfil.
      </p>

      <h4 className="doc-rgpd__sub">¿Por cuánto tiempo conservaremos sus datos?</h4>
      <p>
        Los datos personales proporcionados se conservarán mientras sean necesarios para la
        prestación de los servicios o relación contractual, y en cualquier caso mientras usted
        no solicite su supresión, así como el tiempo necesario para dar cumplimiento a las
        obligaciones legales que en cada caso correspondan acorde con cada tipología de datos.
      </p>

      <h4 className="doc-rgpd__sub">¿Cuál es la legitimación para el tratamiento de sus datos?</h4>
      <p>
        La base legal para el tratamiento de sus datos es la ejecución del contrato de servicios.
        La oferta prospectiva de productos y servicios está basada en el consentimiento que se le
        solicita, sin que en ningún caso la retirada de este consentimiento condicione la
        ejecución del contrato de suscripción.
      </p>

      <h4 className="doc-rgpd__sub">¿A qué destinatarios se comunicarán sus datos?</h4>
      <p>
        Los datos se comunicarán a otras empresas colaboradoras para fines administrativos
        internos, incluido el tratamiento de datos personales de clientes o empleados.
      </p>

      <h4 className="doc-rgpd__sub">¿Cuáles son sus derechos cuando nos facilita sus datos?</h4>
      <ul className="doc-rgpd__list">
        <li>
          Cualquier persona tiene derecho a obtener confirmación sobre si en JORGE MORENO PARDO
          estamos tratando datos personales que les conciernan, o no.
        </li>
        <li>
          Las personas interesadas tienen derecho a acceder a sus datos personales, así como a
          solicitar la rectificación de los datos inexactos o, en su caso, solicitar su supresión
          cuando, entre otros motivos, los datos ya no sean necesarios para los fines que fueron
          recogidos.
        </li>
        <li>
          En determinadas circunstancias, los interesados podrán solicitar la limitación del
          tratamiento de sus datos, en cuyo caso únicamente los conservaremos para el ejercicio
          o la defensa de reclamaciones.
        </li>
        <li>
          En determinadas circunstancias y por motivos relacionados con su situación particular,
          los interesados podrán oponerse al tratamiento de sus datos. La empresa dejará de tratar
          los datos, salvo por motivos legítimos imperiosos, o el ejercicio o la defensa de
          posibles reclamaciones.
        </li>
        <li>Derecho a la portabilidad de sus datos.</li>
      </ul>
    </section>
  );
}

// ───────────── Normas ─────────────
function HojaNormas() {
  return (
    <article className="doc-sheet doc-sheet--normas" style={{ pageBreakBefore: "always", breakBefore: "page" }}>
      <header className="doc-head">
        <img src="logo.png" alt="" className="doc-head__logo" />
        <div className="doc-head__txt">
          <div className="doc-head__brand">Lyceo</div>
          <div className="doc-head__sub">Academia de estudios · Huesca</div>
        </div>
      </header>

      <h1 className="doc-h1">Normas de la academia</h1>
      <div className="doc-curso">Curso 2024 / 2025</div>

      <section className="doc-norma">
        <h2 className="doc-h2"><span className="doc-num">1.</span> Calendario</h2>
        <p>
          La academia sigue el calendario escolar. Esto significa que durante el curso estaremos
          abiertos de septiembre a junio, respetando los festivos y puentes oficiales.
        </p>
        <p>
          En periodos como Navidad y Semana Santa, se habilitarán algunos turnos de mañana para
          quienes deseen mantener el ritmo. Esos días concretos siempre se comunicarán con
          suficiente antelación a través del correo electrónico o del teléfono que nos hayáis
          facilitado, para que las familias puedan organizarse sin problemas.
        </p>
      </section>

      <section className="doc-norma">
        <h2 className="doc-h2"><span className="doc-num">2.</span> Pagos</h2>
        <p>
          La matrícula en la academia se organiza en cuotas mensuales, no por horas. Esto implica
          que el precio es fijo cada mes, independientemente de las faltas que pueda tener el
          alumno. El pago se realiza por adelantado, durante la primera semana de cada mes, y
          puede hacerse de varias formas:
        </p>
        <ul className="doc-list">
          <li>
            En efectivo, entregado directamente o en un sobre con el nombre del alumno en el
            buzón (avisando después por mensaje).
          </li>
          <li>Domiciliando el pago, indicando el número de cuenta en la inscripción.</li>
          <li>
            Mediante ingreso o transferencia bancaria al número de cuenta que se facilita en la
            hoja de inscripción.
          </li>
          <li>
            Por Bizum al número 675 32 41 28 indicando nombre del alumno y mes a pagar en el
            concepto.
          </li>
        </ul>
        <p>
          En caso de recibos devueltos o pagos fuera de plazo, se aplicará un recargo de 10 €.
          Siempre entregamos recibo o factura de cada mensualidad, ya sea en papel o por correo
          electrónico.
        </p>
      </section>

      <section className="doc-norma">
        <h2 className="doc-h2"><span className="doc-num">3.</span> Clases y recuperaciones</h2>
        <p>
          Las clases tienen un horario de inicio y final establecido, que debe cumplirse para
          respetar la organización del grupo y el aforo de la academia. Pedimos puntualidad para
          que el tiempo de todos se aproveche al máximo.
        </p>
        <p>
          Si un alumno no puede asistir a una clase, siempre intentaremos buscar un hueco para
          recuperarla en otro horario disponible dentro del mismo mes, o en la primera semana
          del mes siguiente. Sin embargo, conviene recordar que la mensualidad no se reduce ni
          se devuelve dinero por las ausencias del alumno.
        </p>
        <p>
          En cambio, si es la academia la que no puede impartir una clase y no es posible
          encontrar otro momento para recuperarla, en ese caso sí se devolverá el importe
          correspondiente a esa sesión.
        </p>
      </section>

      <section className="doc-norma doc-norma--break">
        <h2 className="doc-h2"><span className="doc-num">4.</span> Normas de aula</h2>
        <p>
          La convivencia en clase es fundamental para que todos puedan trabajar en un ambiente
          cómodo. Por eso pedimos respeto hacia los compañeros, los profesores y el material de
          la academia. No está permitido comer en clase y el uso del teléfono móvil está
          prohibido durante el tiempo de estudio. En caso de que los padres o tutores necesiten
          ponerse en contacto con su hijo/a, deberán hacerlo a través del teléfono de la academia
          y nosotros le pasaremos el aviso.
        </p>
      </section>

      <section className="doc-norma">
        <h2 className="doc-h2"><span className="doc-num">5.</span> Informes</h2>
        <p>
          Al finalizar cada trimestre, enviamos un informe individualizado a las familias. En él
          se recoge el trabajo realizado, la actitud del alumno y su evolución académica. Este
          informe pretende ser una herramienta útil para que los padres estén informados y
          podamos seguir trabajando juntos en el progreso del estudiante.
        </p>
      </section>

      <section className="doc-norma">
        <h2 className="doc-h2"><span className="doc-num">6.</span> Bajas</h2>
        <p>
          Si en algún momento se desea causar baja en la academia, será necesario comunicarlo con
          al menos siete días de antelación. De esta manera podemos reorganizar grupos y horarios
          de la mejor forma posible.
        </p>
      </section>

      <footer className="doc-foot">
        <span className="doc-foot__lbl">Contacto</span>
        <span>675 32 41 28</span>
        <span className="doc-foot__sep" />
        <span>info@lyceoacademia.com</span>
        <span className="doc-foot__sep" />
        <span>C/ Jazmín 1 bajos · 22002 Huesca</span>
      </footer>
    </article>
  );
}

// ───────────── Pantalla ─────────────
function Documentos() {
  const onPrint = () => {
    document.body.classList.add("printing");
    setTimeout(() => {
      window.print();
      setTimeout(() => document.body.classList.remove("printing"), 300);
    }, 30);
  };

  React.useEffect(() => {
    const after = () => document.body.classList.remove("printing");
    window.addEventListener("afterprint", after);
    return () => window.removeEventListener("afterprint", after);
  }, []);

  return (
    <>
      <div className="doc-toolbar no-print">
        <div className="doc-toolbar__txt">
          <h2 className="doc-toolbar__title">Pack de bienvenida</h2>
          <p className="doc-toolbar__hint">
            Hoja de inscripción y normas de la academia. Se entregan juntas a las familias nuevas.
          </p>
        </div>
        <button className="btn btn--primary" onClick={onPrint}>
          <Icon.printer /> Imprimir todo
        </button>
      </div>

      <div className="doc-stack">
        <HojaInscripcion />
        <HojaNormas />
      </div>
    </>
  );
}

window.Documentos = Documentos;

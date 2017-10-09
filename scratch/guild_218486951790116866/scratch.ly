
\header { 
  tagline = ""
} 
\score {
\new Staff \relative {
\clef bass
    \key g \major
    \repeat unfold 2 { g,16( d' b') a b d, b' d, } |
    \repeat unfold 2 { g,16( e' c') b c e, c' e, } |
}
\layout { }
\midi { }
}
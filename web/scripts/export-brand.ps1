$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$repo = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../..'))
$destination = Join-Path $repo 'web/public/brand'
[IO.Directory]::CreateDirectory($destination) | Out-Null
$fonts = [Drawing.Text.PrivateFontCollection]::new()
$fonts.AddFontFile((Join-Path $repo 'media/txguard-demo/fonts/SpaceGrotesk.ttf'))
$culture = [Globalization.CultureInfo]::InvariantCulture
function Number([double]$value) { return $value.ToString('0.###', $culture) }
function Outline([string]$text, [float]$size) {
  $shape = [Drawing.Drawing2D.GraphicsPath]::new()
  $shape.AddString($text, $fonts.Families[0], 0, $size, [Drawing.PointF]::new(0,0), [Drawing.StringFormat]::GenericTypographic)
  $bounds = $shape.GetBounds()
  $matrix = [Drawing.Drawing2D.Matrix]::new()
  $matrix.Translate(-$bounds.Left, -$bounds.Top)
  $shape.Transform($matrix)
  $points = $shape.PathPoints
  $types = $shape.PathTypes
  $parts = [Collections.Generic.List[string]]::new()
  for ($i = 0; $i -lt $points.Count; $i++) {
    $kind = $types[$i] -band 7
    if ($kind -eq 0) { $parts.Add("M$(Number $points[$i].X) $(Number $points[$i].Y)") }
    elseif ($kind -eq 1) { $parts.Add("L$(Number $points[$i].X) $(Number $points[$i].Y)") }
    elseif ($kind -eq 3) {
      $parts.Add("C$(Number $points[$i].X) $(Number $points[$i].Y) $(Number $points[$i+1].X) $(Number $points[$i+1].Y) $(Number $points[$i+2].X) $(Number $points[$i+2].Y)")
      $i += 2
    }
    if (($types[$i] -band 128) -ne 0) { $parts.Add('Z') }
  }
  $result = @{ Data=($parts -join ' '); Width=$bounds.Width; Height=$bounds.Height }
  $shape.Dispose(); $matrix.Dispose()
  return $result
}
$word = Outline 'TxGuard' 64
$tagline = Outline 'Know Before You Send.' 15
$scale = 40 / $word.Height
$width = [Math]::Ceiling(102 + $word.Width * $scale)
$symbol = 'M8 14h30M23 14v37M53 25a15 15 0 1 0 0 23V37H41'
foreach ($variant in @(@{Name='blue';Color='#2563eb'},@{Name='black';Color='#000000'},@{Name='white';Color='#ffffff'})) {
  $color = $variant.Color
  $mark = "<svg xmlns=`"http://www.w3.org/2000/svg`" viewBox=`"0 0 64 64`" fill=`"none`"><path d=`"$symbol`" stroke=`"$color`" stroke-width=`"7`" stroke-linecap=`"square`" stroke-linejoin=`"miter`"/></svg>"
  $horizontal = "<svg xmlns=`"http://www.w3.org/2000/svg`" viewBox=`"0 0 $width 96`"><g transform=`"translate(8 16)`" fill=`"none`" stroke=`"$color`" stroke-width=`"7`" stroke-linecap=`"square`"><path d=`"$symbol`"/></g><path fill=`"$color`" transform=`"translate(92 20) scale($(Number $scale))`" d=`"$($word.Data)`"/><path fill=`"$color`" transform=`"translate(94 69)`" d=`"$($tagline.Data)`"/></svg>"
  [IO.File]::WriteAllText((Join-Path $destination "txguard-symbol-$($variant.Name).svg"),$mark,[Text.UTF8Encoding]::new($false))
  [IO.File]::WriteAllText((Join-Path $destination "txguard-horizontal-$($variant.Name).svg"),$horizontal,[Text.UTF8Encoding]::new($false))
}
$primary = [IO.File]::ReadAllText((Join-Path $destination 'txguard-horizontal-blue.svg'))
$primary = $primary.Replace('fill="#2563eb" transform="translate(92', 'fill="#111827" transform="translate(92').Replace('fill="#2563eb" transform="translate(94', 'fill="#475569" transform="translate(94')
[IO.File]::WriteAllText((Join-Path $destination 'txguard-primary.svg'),$primary,[Text.UTF8Encoding]::new($false))
Copy-Item -LiteralPath (Join-Path $destination 'txguard-symbol-blue.svg') -Destination (Join-Path $repo 'web/public/favicon.svg')
Copy-Item -LiteralPath (Join-Path $repo 'media/txguard-demo/fonts/OFL-spacegrotesk.txt') -Destination (Join-Path $destination 'FONT-LICENSE.txt')
$fonts.Dispose()
Write-Output 'Exported six flat-color outlined SVG assets, favicon and accompanying font license.'

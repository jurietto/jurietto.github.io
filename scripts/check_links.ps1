# Check local href/src references in HTML files and report missing targets
$root = Get-Location
$files = Get-ChildItem -Recurse -Include *.html,*.htm
$pattern = @'
(?i)(?:href|src)\s*=\s*(?:"([^"]*)"|'([^']*)')
'@

foreach ($f in $files) {
  $content = Get-Content -Raw -LiteralPath $f.FullName
  $matches = [regex]::Matches($content, $pattern, [System.Text.RegularExpressions.RegexOptions]::Singleline)
  foreach ($m in $matches) {
    $url = $m.Groups[1].Value
    if (-not $url) { $url = $m.Groups[2].Value }
    if (-not $url) { continue }
    if ($url -match '^(?i:http:|https:|mailto:|javascript:|data:|//|#)') { continue }
    $u = ($url -split '[?#]')[0]
    if ($u -eq '') { continue }
    if ($u.StartsWith('/')) { $target = Join-Path $root ($u.TrimStart('/')) } else { $target = Join-Path (Split-Path $f.FullName) $u }
    if (-not (Test-Path -LiteralPath $target)) { Write-Output "$($f.FullName) -> $url (MISSING: $target)" }
  }
}

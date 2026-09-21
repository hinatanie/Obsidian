param(
  [Parameter(Mandatory = $true)][string]$InputDocx,
  [Parameter(Mandatory = $true)][string]$OutputPdf
)

$word = $null
$doc = $null
try {
  $word = New-Object -ComObject Word.Application
  $word.Visible = $false
  $word.DisplayAlerts = 0
  $doc = $word.Documents.Open((Resolve-Path -LiteralPath $InputDocx).Path, $false, $true)
  $doc.ExportAsFixedFormat(
    (Join-Path (Resolve-Path -LiteralPath (Split-Path -Parent $OutputPdf)).Path (Split-Path -Leaf $OutputPdf)),
    17
  )
}
finally {
  if ($doc -ne $null) { $doc.Close($false) }
  if ($word -ne $null) { $word.Quit() }
  [System.GC]::Collect()
  [System.GC]::WaitForPendingFinalizers()
}

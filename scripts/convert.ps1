Add-Type -AssemblyName System.Drawing
$img = [System.Drawing.Image]::FromFile("D:\qcreport_logo.emf")
$img.Save("D:\qcreport_form.png", [System.Drawing.Imaging.ImageFormat]::Png)
$img.Dispose()
Write-Host "Done"

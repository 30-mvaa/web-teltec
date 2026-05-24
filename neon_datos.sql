-- Datos para TelTec Net en Neon

-- Usuario admin
INSERT INTO public.usuarios (email, password_hash, nombre, rol, activo, session_timeout_minutes)
VALUES ('vangamarca4@gmail.com', '$2b$12$V5.5SSbxrwTVFAQ2iStZvO1UWNX0YcQfiUeiU4lV83IaqxWaIn6YC', 'Marco AA', 'administrador', true, 30)
ON CONFLICT (email) DO NOTHING;

-- Sectores
INSERT INTO public.sectores (nombre, descripcion, estado) VALUES
('Sisid Centro', 'Sector central de Sisid', 'activo'),
('Caguanapamba', 'Sector de Caguanapamba', 'activo'),
('Tambo', 'Sector del Tambo', 'activo'),
('Chuichun', 'Sector de Chuichun', 'activo'),
('Marcopamba', 'Sector de Marcopamba', 'activo'),
('Cullcaloma', 'Sector de Cullcaloma', 'activo'),
('Zarapamba', 'Sector de Zarapamba', 'activo'),
('Galuay', 'Sector de Galuay', 'activo'),
('Naug Nag', 'Sector de Naug Nag', 'activo'),
('Centro de acopio Sisid', 'Centro de acopio', 'activo'),
('Ingapirca', 'Sector de Ingapirca', 'activo'),
('Tambo Reservorio', 'Tambo Reservorio', 'activo'),
('Churuguayco', 'Sector de Churuguayco', 'activo'),
('Venide Leche', 'Sector de Venide Leche', 'activo'),
('Sisid Anejo', 'Sector de Sisid Anejo', 'activo'),
('Centro', 'Centro principal', 'activo'),
('Cullcaloma', 'Sector Cullcaloma', 'activo'),
('Sisid', 'Sector Sisid', 'activo'),
('Caguanpamba', 'Sector Caguanpamba', 'activo'),
('Cagunapamba Centro', 'Cagunapamba Centro', 'activo');

-- Planes
INSERT INTO public.planes (tipo_plan, precio, descripcion, estado) VALUES
('Plan familiar', 20.00, 'Plan familiar básico', 'activo'),
('Plan Tercera Edad', 18.00, 'Plan para adultos mayores', 'activo'),
('Plan Negocios', 25.00, 'Plan para negocios', 'activo');

-- Clientes (algunos ejemplos)
INSERT INTO public.clientes (cedula, nombres, apellidos, fecha_nacimiento, direccion, email, telefono, estado, id_sector, estado_pago, meses_pendientes, monto_total_deuda) VALUES
('0300624970', 'MARIA GUADALUPE', 'ANGAMARCA ANGAMARCA', '1958-09-04', 'Sisid', 'vangamarca4@gmail.com', '0999859689', 'activo', 16, 'al_dia', 0, 0),
('0301824785', 'MARIA MANUELA', 'YUPA CUZCO', '1981-07-12', 'SISID', 'mmanuela@gmail.com', '0983481554', 'activo', 16, 'vencido', 2, 40),
('0300893658', 'TOMASA', 'MUÑOS HUERTA', '1964-11-13', 'SISID', 'tomasa@gmail.com', '', 'activo', 16, 'vencido', 2, 40),
('0300902103', 'TANIA MERCY', 'ANGAMARCA TENEZACA', '1994-08-05', 'SISID', 'tania@gmail.com', '9876543', 'activo', 16, 'proximo_vencimiento', 1, 20),
('0302426846', 'MARIA LUZ', 'TENEZACA ANGAMARCA', '1988-01-13', 'SISID', 'mluz@gmail.com', '09876545', 'activo', 16, 'vencido', 3, 60),
('0300967031', 'MARIA MANUELA', 'ANGAMARCA CHIMBORAZO', '1963-11-04', 'SISID', 'angamarcam483@gmail.com', '0984400153', 'activo', 16, 'vencido', 2, 40),
('0301386538', 'SERGIO', 'TENEZACA PAUCAR', '1975-10-07', 'SISID', 'serio@gmail.com', '0998969106', 'activo', 16, 'vencido', 5, 100),
('0300791845', 'MARIA AURORA', 'TENEZACA CUZCO', '1987-06-03', 'SISID', 'aurora@gmail.com', '098765432', 'activo', 16, 'proximo_vencimiento', 1, 20),
('0300584380', 'ANTONIO', 'ANGAMARCA YAMASQUI', '1986-07-04', 'SISID', 'antonio@gmail.com', '09876543', 'activo', 7, 'al_dia', 0, 0),
('0301238796', 'EHMA LUCIA', 'ANGAMARCA YAMASQUI', '1964-08-19', 'SISID', 'lucias@gmail.com', '0987654387', 'activo', 7, 'al_dia', 0, 0),
('0301563649', 'LORENZO', 'ANGAMARCA', '1967-10-05', 'SISID', 'lorenzo@gmail.com', '09876543', 'activo', 20, 'al_dia', 0, 0),
('0300590106', 'MARIA ANTONIA', 'CAGUANA YUPA', '1959-04-18', 'CAGUANAPAMBA', 'antonia@gmail.com', '0987654', 'activo', 5, 'vencido', 3, 60),
('0300769189', 'MARIANA DE JESUS', 'YUPA DUTAN', '1961-10-15', 'CAGUNAPAMBA', 'maruayupatambo2022@gmail.com', '0987654006', 'activo', 5, 'vencido', 9, 180),
('0300432002', 'MARIA', 'CAGUANA CAGUANA', '1950-07-27', 'CAGUANAPAMBA', 'janethdre18@gmail.com', '0987654987', 'activo', 5, 'proximo_vencimiento', 1, 18),
('0302382759', 'JONATHAN MANUEL', 'ESPINOZA BUÑAY', '1994-07-06', 'CAGUNAPAMBA', 'jhona@gmail.com', '0987654', 'activo', 5, 'vencido', 9, 180),
('0300741733', 'MARIA JESUS', 'YUPA CAGUANA', '1958-12-12', 'CAGUANPAMABA', 'mariaJ@gmail.com', '098765', 'activo', 14, 'vencido', 4, 80),
('0301078705', 'MANUEL SANTIAGO', 'ZHAO BUÑAY', '1965-12-13', 'CAGUANAPAMBA', 'zhaosantiago55@gmail.com', '0987654098', 'activo', 14, 'vencido', 3, 60),
('0302567680', 'DAVID ELIAS', 'CHIMBORAZO YUPA', '1994-01-10', 'AGUNAPAMBA', 'elias@gmail.com', '0987654', 'activo', 14, 'vencido', 9, 180),
('0302580873', 'LUIS GEOVANNY', 'CAGUANA YUPA', '2001-06-11', 'CAGUANAPAMBA', 'jova@gmail.com', '09876', 'activo', 14, 'proximo_vencimiento', 1, 20),
('0301029187', 'ALFONSO', 'MAYANCELA CAGUANA', '1967-04-29', 'CAGUANAPMABA', 'alfonso@gmail.com', '098765', 'activo', 14, 'vencido', 7, 140);

-- Verificar datos
SELECT 'usuarios' as tabla, COUNT(*) as total FROM usuarios
UNION ALL
SELECT 'clientes', COUNT(*) FROM clientes
UNION ALL
SELECT 'sectores', COUNT(*) FROM sectores
UNION ALL
SELECT 'planes', COUNT(*) FROM planes;
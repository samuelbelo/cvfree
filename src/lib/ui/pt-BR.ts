/**
 * Brazilian Portuguese for the app interface. The English text is the key, so a sentence that is
 * missing here shows up in English instead of breaking. `{name}` marks a value filled in at run time.
 */
export const PT_BR: Record<string, string> = {
  // Shared words
  Save: "Salvar",
  Cancel: "Cancelar",
  Close: "Fechar",
  Delete: "Excluir",
  Edit: "Editar",
  Rename: "Renomear",
  Duplicate: "Duplicar",
  Renamed: "Nome alterado",
  Copy: "Copiar",
  Copied: "Copiado",
  Import: "Importar",
  Password: "Senha",
  Template: "Modelo",
  Color: "Cor",
  Version: "Versão",
  On: "Sim",
  Off: "Não",
  "Not found": "Não encontrado",
  'Delete "{title}"?': 'Excluir "{title}"?',
  "edited {date}": "última edição em {date}",

  // Header and sign in
  Resumes: "Currículos",
  Settings: "Configurações",
  "Sign out": "Sair",
  "Sign in": "Entrar",
  Continue: "Continuar",
  "This cvfree instance is protected with a password.": "Esta instância do cvfree é protegida por senha.",
  "Wrong password": "Senha incorreta",
  "Too many attempts. Try again in a few minutes.": "Muitas tentativas. Tente de novo em alguns minutos.",

  // Dashboard
  "Your resumes": "Seus currículos",
  "1 resume. Saved on your server.": "1 currículo. Salvo no seu servidor.",
  "{n} resumes. Saved on your server.": "{n} currículos. Salvos no seu servidor.",
  "Create your first resume. It takes a few minutes.": "Crie seu primeiro currículo. Leva poucos minutos.",
  "New resume": "Novo currículo",
  "Start from example": "Começar por um exemplo",
  "JSON file": "Arquivo JSON",
  "A cvfree backup or a JSON Resume file": "Um backup do cvfree ou um arquivo JSON Resume",
  "LinkedIn profile": "Perfil do LinkedIn",
  "The zip from Get a copy of your data": "O zip de “Obtenha uma cópia dos seus dados”",
  "JSON file to import": "Arquivo JSON para importar",
  "LinkedIn archive to import": "Arquivo do LinkedIn para importar",
  "Resume actions": "Ações do currículo",
  "New cover letter": "Nova carta de apresentação",
  "Combine with": "Combinar com",
  "Download PDF": "Baixar PDF",
  "Backup JSON": "Backup em JSON",
  "Rename resume": "Renomear currículo",
  "Resume completeness": "Completude do currículo",
  "The file is removed from the server. Download a JSON backup first if you may need it.":
    "O arquivo é removido do servidor. Baixe antes um backup em JSON se achar que vai precisar.",
  "Could not create the resume": "Não foi possível criar o currículo",
  "Copy created": "Cópia criada",
  "Resume imported": "Currículo importado",
  "LinkedIn profile imported": "Perfil do LinkedIn importado",
  "Read it through and trim what a resume does not need.": "Leia tudo e corte o que um currículo não precisa.",
  "Import failed": "A importação falhou",
  "Import failed ({status})": "A importação falhou ({status})",
  "That file is not a cvfree backup or a JSON Resume file": "Esse arquivo não é um backup do cvfree nem um arquivo JSON Resume",
  "One resume file could not be read": "Um arquivo de currículo não pôde ser lido",
  "{n} resume files could not be read": "{n} arquivos de currículo não puderam ser lidos",
  "in {folder}. They were left untouched. Open the file in a text editor, fix the JSON, or import a backup of it.":
    "em {folder}. Nada foi alterado neles. Abra o arquivo em um editor de texto, corrija o JSON ou importe um backup dele.",

  // Combine two resumes
  "Combine “{title}” with": "Combinar “{title}” com",
  "A new resume gets every section of both. Summary, skills and languages are merged, jobs and education are appended. The two originals stay as they are.":
    "Um novo currículo recebe todas as seções dos dois. Resumo, habilidades e idiomas são unidos, experiências e formação são acrescentadas. Os dois originais ficam como estão.",
  "{n} sections": "{n} seções",
  "You need a second resume to combine with.": "Você precisa de um segundo currículo para combinar.",
  "Combined into a new resume. Both originals are unchanged.": "Combinados em um novo currículo. Os dois originais continuam iguais.",
  "Could not combine": "Não foi possível combinar",
  "Pick a resume to combine with": "Escolha um currículo para combinar",

  // Cover letters
  "Cover letters": "Cartas de apresentação",
  "1 letter. It matches the style of the resume it came from.": "1 carta. Ela segue o estilo do currículo de origem.",
  "{n} letters. Each one matches the style of the resume it came from.": "{n} cartas. Cada uma segue o estilo do currículo de origem.",
  "A short letter per application, with your resume's name, contact details and colors already in place.":
    "Uma carta curta para cada candidatura, já com o nome, os contatos e as cores do seu currículo.",
  "Take name, contact and style from": "Usar nome, contato e estilo de",
  "Start blank": "Começar em branco",
  "No company yet": "Sem empresa ainda",
  "Letter actions": "Ações da carta",
  "Download Word": "Baixar Word",
  "Rename cover letter": "Renomear carta de apresentação",
  "The file is removed from the server.": "O arquivo é removido do servidor.",
  "Could not create the letter": "Não foi possível criar a carta",
  "Resume not found": "Currículo não encontrado",

  // Settings
  "Defaults for new resumes and the state of this instance.": "Padrões para novos currículos e o estado desta instância.",
  Preferences: "Preferências",
  "Interface language": "Idioma da interface",
  "New resume defaults": "Padrões para novos currículos",
  "Resume language": "Idioma do currículo",
  "Settings saved": "Configurações salvas",
  "Could not save settings": "Não foi possível salvar as configurações",
  Instance: "Instância",
  "These values come from environment variables. Change them in your {env} or {compose} and restart.":
    "Estes valores vêm de variáveis de ambiente. Altere no seu {env} ou {compose} e reinicie.",
  "Data folder": "Pasta de dados",
  "PDF engine": "Gerador de PDF",
  "AI features": "Recursos de IA",
  "Back this folder up to keep your resumes safe.": "Faça backup desta pasta para manter seus currículos seguros.",
  "Headless Chrome renders pixel-exact PDFs.": "O Chrome headless gera PDFs com precisão de pixel.",
  "Install Chrome/Chromium or set CHROME_PATH. Browser printing still works.":
    "Instale o Chrome/Chromium ou defina CHROME_PATH. A impressão pelo navegador continua funcionando.",
  "Set AI_MODEL, AI_API_KEY and AI_BASE_URL (any OpenAI-compatible API, Ollama included).":
    "Defina AI_MODEL, AI_API_KEY e AI_BASE_URL (qualquer API compatível com OpenAI, Ollama incluso).",
  "Set CVFREE_PASSWORD before exposing the app on the internet.": "Defina CVFREE_PASSWORD antes de expor o app na internet.",
  "On, token required": "Sim, exige token",
  "On, no token": "Sim, sem token",
  "Lets an AI assistant edit the resumes. See the MCP section below.": "Permite que um assistente de IA edite os currículos. Veja a seção MCP abaixo.",

  // Backup
  Backup: "Backup",
  "One zip with {resumes}, {letters} and these settings, photos included. Version history stays on the server.":
    "Um zip com {resumes}, {letters} e estas configurações, fotos incluídas. O histórico de versões fica no servidor.",
  "1 resume": "1 currículo",
  "{n} resumes": "{n} currículos",
  "1 cover letter": "1 carta de apresentação",
  "{n} cover letters": "{n} cartas de apresentação",
  "Restoring adds what is missing and replaces a resume or letter only when the backup holds a newer copy. Nothing is deleted.":
    "A restauração adiciona o que falta e só substitui um currículo ou carta quando o backup tem uma cópia mais recente. Nada é excluído.",
  "Download backup": "Baixar backup",
  "Restore from backup": "Restaurar de um backup",
  "Backup zip to restore": "Zip de backup para restaurar",
  "{name} downloaded": "{name} baixado",
  "Backup failed": "O backup falhou",
  "Backup failed ({status})": "O backup falhou ({status})",
  "Backup restored": "Backup restaurado",
  "Nothing to restore": "Nada para restaurar",
  "Restore failed": "A restauração falhou",
  "Restore failed ({status})": "A restauração falhou ({status})",
  "{n} added": "adicionados: {n}",
  "{n} replaced by the newer copy": "substituídos pela cópia mais recente: {n}",
  "{n} already up to date": "já atualizados: {n}",
  "settings restored": "configurações restauradas",
  "1 file could not be read": "1 arquivo não pôde ser lido",
  "{n} files could not be read": "{n} arquivos não puderam ser lidos",
  "This file is larger than the 100 MB a backup can be": "Este arquivo passa dos 100 MB que um backup pode ter",

  // MCP
  "Any MCP client (Claude Code, Claude Desktop, Cursor, your own agent) can list, review, edit and export the resumes and cover letters on this instance through {endpoint}. Every write goes through the same checks as the editor.":
    "Qualquer cliente MCP (Claude Code, Claude Desktop, Cursor, seu próprio agente) pode listar, revisar, editar e exportar os currículos e as cartas de apresentação desta instância por {endpoint}. Toda escrita passa pelas mesmas verificações do editor.",
  "The endpoint is off. The app has a password, so MCP needs its own secret: set {token} (a long random string, for example {command}) and restart.":
    "O endpoint está desligado. O app tem senha, então o MCP precisa de um segredo próprio: defina {token} (um texto longo e aleatório, por exemplo {command}) e reinicie.",
  "No password and no token: anyone who can reach this port can use the endpoint, like the rest of the app. Set {token} before exposing it.":
    "Sem senha e sem token: quem alcançar esta porta pode usar o endpoint, como o resto do app. Defina {token} antes de expor.",
  "Claude Desktop, Cursor and others (mcp.json)": "Claude Desktop, Cursor e outros (mcp.json)",
  "Could not copy. Select the text and copy it by hand.": "Não foi possível copiar. Selecione o texto e copie manualmente.",

  // Messages the server sends back for uploads and zips
  "This file is larger than the 100 MB this app accepts": "Este arquivo passa dos 100 MB que o app aceita",
  "The upload was cut short. Try again.": "O envio foi interrompido. Tente de novo.",
  "Not a cvfree backup or a JSON Resume file": "Não é um backup do cvfree nem um arquivo JSON Resume",
  "Not a zip file": "Este arquivo não é um zip",
  "This zip could not be read": "Não foi possível ler este zip",
  "This zip is damaged": "Este zip está corrompido",
  "This zip is password protected": "Este zip está protegido por senha",
  "This zip is too large to read here": "Este zip é grande demais para ser lido aqui",
  "This zip holds too many files": "Este zip tem arquivos demais",
  "This zip unpacks to more than this app accepts": "Este zip, descompactado, passa do tamanho que o app aceita",
  "This zip holds no cvfree resumes or cover letters": "Este zip não tem currículos nem cartas do cvfree",
  "This is a cvfree backup. Restore it in Settings, under Backup.": "Este é um backup do cvfree. Restaure em Configurações, na seção Backup.",
  "No LinkedIn profile was found in this zip. It should hold Profile.csv and Positions.csv. When LinkedIn sends the archive in parts, use the complete one.":
    "Nenhum perfil do LinkedIn foi encontrado neste zip. Ele deveria ter Profile.csv e Positions.csv. Quando o LinkedIn envia o arquivo em partes, use o completo.",
}

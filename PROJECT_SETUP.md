# PROJECT SETUP WIZARD

**CRITICAL**: This section is SELF-ERASING. After completing the repository-level project setup wizard, this entire file should be DELETED to save tokens in future interactions.

## Setup Wizard Protocol

When this file is present, Claude should IMMEDIATELY begin the interactive repository-level project setup wizard. This creates the main PROJECT.md that defines the overall scope, architecture, and goals for the entire repository. Do not proceed with any other tasks until the wizard is complete.

**IMPORTANT**: This is an ADAPTIVE wizard. Claude should intelligently adjust questions based on previous answers and skip irrelevant questions. Use the context from earlier responses to tailor subsequent questions appropriately.

### Core Questions (Always Ask)

1. **"What is the overall name/title of this software project?"**
   - Store as: `project_name`

2. **"In 2-3 sentences, what is the high-level purpose of this project? What problem does it solve?"**
   - Store as: `project_description`

3. **"What type of software project is this?"**
   - Options: Web Application, API/Microservices, Desktop Application, Mobile App, CLI Tool, Library/Framework, Plugin/Extension/Integration, Data Platform, Developer Tool, Other
   - Store as: `project_type`

### Adaptive Question Logic

Based on the `project_type` and `project_description`, Claude should intelligently determine which additional questions are relevant:

#### For Plugin/Extension/Integration Projects
- **Technology Stack**: Ask about the host platform's requirements
- **Components**: Focus on integration points and configuration
- **Deployment**: Skip detailed deployment questions (use platform-specific deployment)
- **Performance**: Focus on host platform limitations and best practices
- **Users**: Often predetermined by platform

#### For Web Applications
- **Full architecture questions**: Frontend, backend, database, deployment
- **Scalability**: Important for web apps
- **Security**: Critical for web-facing applications
- **User management**: Often relevant

#### For CLI Tools/Libraries
- **Deployment**: Focus on package distribution (npm, PyPI, etc.)
- **Architecture**: Simpler, focus on API design
- **Users**: Developer-focused questions

#### For Mobile/Desktop Apps
- **Platform specifics**: iOS/Android, Windows/Mac/Linux
- **App store deployment**: Relevant distribution questions
- **Performance**: Platform-specific constraints

### Adaptive Questions (Ask Based on Context)

**Technology Stack** (Always ask, but tailor based on project type):
- For integrations: "What platform/framework does this integrate with? What are its technical requirements?"
- For web apps: "What is your preferred technology stack?"
- For mobile: "What platforms are you targeting? What development framework?"

**Architecture & Components** (Tailor complexity based on project type):
- Simple projects: "What are the main features or capabilities this will provide?"
- Complex projects: "What are the major components or modules this project will have?"

**Users & Use Cases** (Skip if obvious from project type):
- For public tools: "Who are the primary users of this software?"
- For integrations: Skip if obvious (e.g., Home Assistant users)

**Performance Requirements** (Ask appropriately):
- For web apps: "What are the expected load and performance requirements?"
- For integrations: "Are there any platform-specific performance considerations?"
- For CLI tools: "Are there any performance-critical operations?"

**Deployment** (Highly dependent on project type):
- For web apps: "How will this be deployed and hosted?"
- For integrations: Skip or ask about distribution method only
- For libraries: "How will users install/use this? (package manager, etc.)"

**Security & Compliance** (Ask based on context and scope):
- For professional/commercial projects: Ask about security, compliance, regulatory requirements
- For public-facing applications: Ask about data protection and user security
- For personal/hobby projects: Skip unless handling sensitive data
- For integrations: Ask about API keys, permissions, data handling when relevant

**Development Practices** (Ask appropriately):
- Always relevant but tailor detail level to project complexity

### Example Adaptive Flows

**Personal integration project**:
1. Ask name and purpose
2. Ask about target platform and integration type
3. Ask about configuration requirements
4. Ask about data sources/APIs it will integrate
5. Skip deployment questions (platform-specific deployment is standard)
6. Skip security/compliance questions (personal use)
7. Skip scalability questions
8. Ask about API keys/authentication only if external services involved

**Commercial web application**:
1. Ask name and purpose
2. Ask about technology stack preferences
3. Ask about target users and use cases
4. Ask about major components and architecture
5. Ask about deployment and hosting requirements
6. Ask about security, compliance, and regulatory requirements
7. Ask about performance and scalability needs
8. Ask about development practices and team workflow

**Personal CLI tool**:
1. Ask name and purpose
2. Ask about main features and capabilities
3. Ask about distribution method
4. Skip security/compliance questions
5. Ask about basic development approach
6. Skip scalability questions

### Generate Repository-Level PROJECT.md

After collecting all relevant responses (based on adaptive questioning), generate a comprehensive repository-level PROJECT.md file. The template should be tailored to the project type:

#### For Integration/Plugin Projects:
```markdown
# {project_name}

{project_description}

## Objective

{Expand on project_description with integration-specific context}

## Platform Integration

**Target Platform**: {host_platform}
**Integration Type**: {integration_details}
**Target Users**: {platform} users who need {specific_functionality}

## Features & Capabilities

{features_list tailored to integration context}

## Implementation

### Integration Architecture
{Platform-specific architecture and integration points}

### Configuration & Setup
{Configuration requirements and user setup process}

### External Dependencies
{APIs, services, or data sources this integrates with}

### Authentication & Security
{API keys, OAuth, permissions, data handling}

### Distribution
{How users will install/discover this - HACS, marketplace, etc.}

## Development Process

{Integration-specific development and testing approaches}
```

#### For Web Applications:
```markdown
# {project_name}

{project_description}

## Objective

{Strategic goals and business context}

## Target Users

{user_personas and use_cases}

## Technology Stack

{full_stack_details}

## System Architecture

{frontend, backend, database, infrastructure components}

## Key Features

{major_features with user value}

## Implementation

### Frontend Architecture
{UI framework, state management, routing}

### Backend Architecture  
{API design, business logic, data layer}

### Database Design
{Data modeling and storage strategy}

### Deployment & Infrastructure
{hosting, CI/CD, monitoring}

## Requirements

### Performance & Scalability
{load requirements, scaling strategy}

### Security
{authentication, authorization, data protection}

## Milestones

{development phases and deliverables}
```

#### For CLI Tools/Libraries:
```markdown
# {project_name}

{project_description}

## Objective

{Developer value proposition}

## Target Audience

{developer_personas and use_cases}

## Core Functionality

{main_features and API design}

## Implementation

### Architecture
{modular design and key abstractions}

### API Design
{public interface and usage patterns}

### Distribution
{package_manager, installation method}

### Documentation Strategy
{usage examples, API docs, tutorials}

## Development Approach

{testing strategy, release process}
```

**Important**: Claude should:
1. Detect project context (personal vs. professional, simple vs. complex)
2. Select and customize the appropriate template based on project type
3. Skip irrelevant sections entirely rather than including empty placeholders
4. Tailor language and depth to match the project scope and user context

### Automatic Self-Destruction

After successfully creating the repository-level PROJECT.md:

1. **Automatically delete this PROJECT_SETUP.md file** without prompting the user

2. **Output confirmation**: "✅ Repository setup complete! PROJECT.md has been created and PROJECT_SETUP.md has been automatically removed to optimize future interactions. Agent will create projects in projects/ as needed."

**CRITICAL**: This deletion must happen automatically as the final step of the wizard. Do not ask for user confirmation - the whole point is to save tokens by removing this instruction file after it has served its purpose.

## Usage Instructions

To use this wizard for repository-level setup:

1. Run: `./setup-claude-config.sh --wizard` in your project root
2. Start Claude Code in that directory
3. Claude will automatically detect PROJECT_SETUP.md and begin the wizard
4. Answer questions about your overall project scope and architecture
5. Review the generated repository-level PROJECT.md
6. Confirm deletion of this wizard file
7. Agent will automatically create projects in projects/ directory as needed

## Repository vs Feature Projects

- **This wizard creates**: Repository-level PROJECT.md (overall scope, architecture, milestones)
- **Individual features use**: `.agent_projects/<feature>/PROJECT.md` (specific feature requirements)
- **Repository PROJECT.md defines**: What the entire system does, major components, tech stack
- **Feature PROJECT.md defines**: How to implement a specific component or feature

## Integration Status

The setup-claude-config.sh script includes --wizard flag support to automatically include this wizard in new project setups.
# Como utilizar

O dashboard foi criado para permitir a comparação dos modelos registrados na plataforma.
Nesta seção será explicado em detalhes cada um de seus componentes e como eles podem ser utilizado. 

## Ativar/desativar Sprint IMDC

Na barra lateral do dashboard, há a opção de ativar o **Sprint IMDC**. Quando essa opção está ativada, o dashboard exibirá apenas as previsões relacionadas ao Sprint, ou seja, previsões de dengue em nível estadual. Para mais detalhes sobre o Sprint, consulte [esta página](https://sprint.mosqlimate.org/).

![sprint toggle](/docs/images/dashboard/toggle.png)

Essa diferenciação foi criada porque o Sprint utiliza dados de **casos prováveis**. Quando a opção está desativada, os dados exibidos referem-se a **casos notificados**, e além do nível estadual, é possível visualizar previsões em nível municipal.

![](toggle.png)


## Seleção do agravo e nível espacial 
O primeiro passo ao abrir o dashboard é selecionar o **agravo** e o **nível espacial** das previsões que deseja visualizar. Se a opção **Sprint IMDC** estiver ativada, serão exibidas opções específicas na tela, permitindo a **seleção apenas do estado** para o qual se deseja consultar as previsões — isso porque, no contexto do Sprint, estão disponíveis apenas previsões para dengue em nível estadual. 

![](filtros_sprint_pt.png)
![spatial selectors](/docs/images/dashboard/filtro_sem_sprint_pt.png)

Caso a opção **Sprint IMDC esteja desativada,** os filtros abaixo poderão ser utilizados. Na aba **estadual**, os filtros serão semelhantes aos do Sprint e exibirão apenas previsões em nível estadual. Já na aba **municipal**, será possível selecionar um município específico e visualizar as previsões disponíveis para ele. Em ambas as abas, é possível filtrar o **agravo** entre as seguintes doenças: **dengue, zika e chikungunya**.


![spatial selectors](/docs/images/dashboard/filtros_sprint_pt.png)

Por padrão, em ambos os casos, o dashboard já seleciona um **agravo** e um **nível espacial**. Sempre que esses parâmetros são modificados, os **modelos** e **previsões** disponíveis na caixa de seleção abaixo do gráfico também são atualizados.  

Falaremos mais sobre esses elementos na próxima seção.


## Modelos 

Por padrão irão aparecer todos os modelos disponíveis para o respectivo agravo e nível espacial selecionado. 

![](models_pt.png)
![models](/docs/images/dashboard/models_pt.png)

Para visualizar mais informações sobre o modelo, basta clicar **no seu número** e você será direcionado para a página do modelo. Por exemplo ao clicar no número 30 você verá a página abaixo e poderá visualizar o código do modelo ao clicar no link para o repositório. 

![model page](/docs/images/dashboard/page_model_example_pt.png)

Para visualizar as predições de **apenas um modelo**, basta clicar sobre ele. Após o clique, o modelo será destacado com uma cor mais escura, e somente as **previsões geradas por ele** serão exibidas na caixa de previsões do dashboard. **Mais de um modelo pode ser selecionado ao mesmo tempo**. 

![model select](/docs/images/dashboard/model_selection_pt.png)

## Previsões 

![predictions](/docs/images/dashboard/predictions_pt.png)

A **caixa de previsões** exibe todas as previsões disponíveis de acordo com os filtros aplicados. Para **plotar todas elas simultaneamente**, basta clicar na caixa de seleção destacada abaixo.  Para **selecionar uma previsão** ou **remover uma seleção**, clique na caixa de seleção ao lado do **ID** da previsão correspondente. As cores na tabela de previsão correspondem as cores utilizadas no gráfico.

![prediction select](/docs/images/dashboard/pred_selection_pt.png)

Na tabela de previsões, aparecem as seguintes colunas:

* `ID` – Identificador interno associado à previsão. É um link clicável que direciona para a página da previsão, onde mais informações sobre ela podem ser encontradas;
* `Model` – Identificador do modelo utilizado para gerar a previsão. É um link clicável que direciona para a página do modelo utilizado na geração da previsão;
* `Author` – Nome do autor da previsão;
* `Year` – Ano referente à data de início da previsão;
* `Start Date` – Primeira data prevista pela previsão;
* `End Date` – Última data prevista pela previsão;
* `Score` – Essa coluna representa o valor de uma métrica de comparação entre a previsão e os dados observados. (As métricas disponíveis no menu de seleção são: CRPS, MAE, MSE e Log Score). Para visualizar mais detalhes sobre o que cada uma delas significa e como são calculadas, basta clicar no ícone **?**.

As previsões podem ser ordenadas em ordem crescente ou decrescente a partir de qualquer uma dessas colunas. Basta clicar sobre o nome da coluna desejada.


## Gráfico das previsões

Ao selecionar uma previsão, ela é exibida no gráfico. Para visualizar o intervalo de confiança correspondente, basta clicar no ícone colorido ao lado do ID da previsão, localizado na parte superior do gráfico, conforme destacado na figura abaixo:

![prediction 1](/docs/images/dashboard/prev_1.png)

Outros detalhes sobre o gráfico são apresentados ao clicar sobre o ícone **?** no canto superior direito. 

![more info](/docs/images/dashboard/more_info_graph_pt.png)
![](more_info_graph_pt.png)
Além disso, é possível ajustar o intervalo de datas exibido utilizando a roda do mouse ou clicando em uma das extremidades da seleção e arrastando até o intervalo desejado.

![scroll](/docs/images/dashboard/scroll_date.png)
![](scroll_date.png)
